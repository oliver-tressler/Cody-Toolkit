using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata;
using Microsoft.Xrm.Sdk.Metadata.Query;
using Microsoft.Xrm.Sdk.Query;
using proxygenerator.Data.Builder;
using proxygenerator.Data.Model;
using proxygenerator.Properties;
using utils;

namespace proxygenerator.Data
{
    [Serializable]
    public class EntityMetadataCache
    {
        private readonly IOrganizationService _service;
        private readonly eLanguage _language;
        private readonly bool _globalEnums;
        private readonly List<string> _availableProxies;
        private readonly ConcurrentDictionary<string, RelatedEntityData> _relatedEntities;

        public EntityMetadataCache(IOrganizationService service, ProxyGenerationOptions options, List<string> availableProxies)
        {
            _service = service;
            _language = options.Language;
            _availableProxies = availableProxies;
            _relatedEntities = new ConcurrentDictionary<string, RelatedEntityData>();
        }

        private void LoadRelatedUncachedEntities(Dictionary<string, HashSet<string>> requiredRelatedInformation)
        {
            var requests = SplitRequiredRelatedDataRequests(requiredRelatedInformation, out var mergeRequired);
            foreach (var dictionary in requests)
            {
                IEntityBuilder entityBuilder;
                switch (_language)
                {
                    case eLanguage.Typescript:
                        entityBuilder = new Builder.TS.EntityBuilder(this);
                        break;
                    case eLanguage.CSharpCrmToolkit:
                        entityBuilder = new Builder.CS.EntityBuilder(this, new List<string>(), false);
                        break;
                    default:
                        throw new ArgumentOutOfRangeException();
                }
                var request = new RetrieveMetadataChangesRequest
                {
                    Query = new EntityQueryExpression {Criteria = new MetadataFilterExpression(LogicalOperator.And)}
                };
                request.Query.Criteria.Conditions.Add(new MetadataConditionExpression("LogicalName",
                    MetadataConditionOperator.In, dictionary.Keys.ToArray()));
                request.Query.AttributeQuery = new AttributeQueryExpression
                {
                    Criteria = new MetadataFilterExpression(LogicalOperator.Or)
                };
                request.Query.AttributeQuery.Criteria.Filters.AddRange(dictionary.Keys.Select(entityLogicalName =>
                {
                    var filter = new MetadataFilterExpression(LogicalOperator.And);
                    filter.Conditions.Add(new MetadataConditionExpression("EntityLogicalName",
                        MetadataConditionOperator.Equals, entityLogicalName));
                    filter.Conditions.Add(new MetadataConditionExpression("LogicalName", MetadataConditionOperator.In,
                        dictionary[entityLogicalName].ToArray()));
                    return filter;
                }));
                var response = _service.Execute(request) as RetrieveMetadataChangesResponse ??
                               throw new Exception("No response");
                IAttributeBuilder attributeBuilder;
                switch (_language)
                {
                    case eLanguage.Typescript:
                        attributeBuilder = new Builder.TS.Attributes.AttributeBuilder();
                        break;
                    case eLanguage.CSharpCrmToolkit:
                        attributeBuilder = new Builder.CS.Attributes.AttributeBuilder();
                        break;
                    default:
                        throw new ArgumentOutOfRangeException();
                }
                foreach (var entityMetadata in response.EntityMetadata)
                    // The request for one entity exceeded the filter size and had to be split into two request sets
                    // Merge those sets
                    if (mergeRequired &&
                        _relatedEntities.TryGetValue(entityMetadata.LogicalName, out var existingMetadata))
                    {
                        existingMetadata.Attributes.AddRange(
                            entityMetadata.Attributes.Select(attr => attributeBuilder.BuildAttribute(attr)));
                    }
                    else
                    {
                        var relatedEntityData = entityBuilder.ConstructRelatedEntity(entityMetadata);
                        _relatedEntities.AddOrUpdate(relatedEntityData.LogicalName, relatedEntityData, (_, red) => relatedEntityData);
                    }
            }
        }

        public RelatedEntityData GetRelatedEntity(string entityLogicalName)
        {
            return _relatedEntities[entityLogicalName] ?? throw new Exception($"Cache miss for {entityLogicalName}");
        }

        public IEnumerable<EntityData> GetEntities(params string[] entityLogicalNames)
        {
            ConsoleHelper.RefreshLine($"Generating {string.Join(", ", entityLogicalNames.Take(3))}" +
                                      (entityLogicalNames.Length > 3 ? $" and {entityLogicalNames.Length - 3} more" : ""));
            List<EntityMetadata> metadatas;
            IEntityBuilder entityBuilder;
            switch (_language)
            {
                case eLanguage.Typescript:
                    entityBuilder = new Builder.TS.EntityBuilder(this);
                    break;
                case eLanguage.CSharpCrmToolkit:
                    entityBuilder = new Builder.CS.EntityBuilder(this, _availableProxies, _globalEnums);
                    break;
                default:
                    throw new ArgumentOutOfRangeException();
            }
            ConsoleHelper.RefreshLine($"Retrieving {entityLogicalNames.Distinct().Count()} root entities ...");
            if (Settings.Default.USE_LEGACY_ROOT_ENTITY_FETCH)
            {
                metadatas = (from entityLogicalName in entityLogicalNames.Distinct()
                             select new RetrieveEntityRequest
                             {
                                 LogicalName = entityLogicalName,
                                 EntityFilters = EntityFilters.Relationships | EntityFilters.Attributes | EntityFilters.Entity,
                                 RetrieveAsIfPublished = true
                             }
                    into legacyRequest
                             select _service.Execute(legacyRequest) as RetrieveEntityResponse
                    into response
                             select response?.EntityMetadata ?? throw new Exception("No response")).ToList();
            }
            else
            {
                var request = new RetrieveMetadataChangesRequest
                {
                    Query = new EntityQueryExpression
                    {
                        Criteria = new MetadataFilterExpression(LogicalOperator.And)
                        {
                            Conditions = { new MetadataConditionExpression("LogicalName", MetadataConditionOperator.In, entityLogicalNames) }
                        }
                    }
                };
                var response = _service.Execute(request) as RetrieveMetadataChangesResponse;
                metadatas = (response?.EntityMetadata ?? throw new Exception("No response")).ToList();
            }
            ConsoleHelper.RefreshLine("Caching root entities ...");
            // Cache fetched entities first to avoid unnecessary retrieval
            foreach (var entityMetadata in metadatas)
            {
                var relatedEntity = entityBuilder.ConstructRelatedEntity(entityMetadata);
                _relatedEntities.AddOrUpdate(entityMetadata.LogicalName, relatedEntity, (_, uvf) => relatedEntity);
            }
            ConsoleHelper.RefreshLine("Identifying related entities ...");
            var relatedInformation = GetRequiredRelatedData(metadatas.ToArray());
            ConsoleHelper.RefreshLine($"Retrieving {relatedInformation.Count} related entities");
            LoadRelatedUncachedEntities(relatedInformation);
            ConsoleHelper.RefreshLine("Constructing proxies ...");
            var constructedEntities = metadatas.Select(entityBuilder.ConstructEntity);
            return constructedEntities;
        }

        private Dictionary<string, HashSet<string>> GetRequiredRelatedData(params EntityMetadata[] metadatas)
        {
            var requiredEntities = new Dictionary<string, HashSet<string>>();
            foreach (var metadata in metadatas)
            {
                foreach (var otm in metadata.ManyToOneRelationships)
                {
                    if (_relatedEntities.TryGetValue(otm.ReferencedEntity, out var existingOtmEntity) &&
                        existingOtmEntity.Attributes.Any(a => a.LogicalName == otm.ReferencedAttribute))
                    {
                        continue;
                    }

                    if (!requiredEntities.TryGetValue(otm.ReferencedEntity, out var otmAttributes))
                    {
                        otmAttributes = new HashSet<string> { otm.ReferencedAttribute };
                        requiredEntities.Add(otm.ReferencedEntity, otmAttributes);
                        continue;
                    }

                    if (!otmAttributes.Contains(otm.ReferencedAttribute)) otmAttributes.Add(otm.ReferencedAttribute);
                }

                foreach (var mto in metadata.OneToManyRelationships)
                {
                    if (_relatedEntities.TryGetValue(mto.ReferencingEntity, out var existingMtoEntity) &&
                        existingMtoEntity.Attributes.Any(a => a.LogicalName == mto.ReferencingAttribute))
                    {
                        continue;
                    }

                    if (!requiredEntities.TryGetValue(mto.ReferencingEntity, out var mtoAttributes))
                    {
                        mtoAttributes = new HashSet<string> { mto.ReferencingAttribute };
                        requiredEntities.Add(mto.ReferencingEntity, mtoAttributes);
                        continue;
                    }

                    if (!mtoAttributes.Contains(mto.ReferencingAttribute)) mtoAttributes.Add(mto.ReferencingAttribute);
                }

                foreach (var mtm in metadata.ManyToManyRelationships)
                {
                    var relatedEntityIsEntityOne = mtm.Entity1LogicalName != metadata.LogicalName;
                    var relatedEntityLogicalName =
                        relatedEntityIsEntityOne ? mtm.Entity1LogicalName : mtm.Entity2LogicalName;
                    if (_relatedEntities.ContainsKey(relatedEntityLogicalName))
                        continue;
                    if (!requiredEntities.ContainsKey(relatedEntityLogicalName))
                        requiredEntities.Add(relatedEntityLogicalName, new HashSet<string>());
                }

                foreach (var lookupTarget in metadata.Attributes.OfType<LookupAttributeMetadata>().SelectMany(lookup => lookup.Targets).Distinct())
                {
                    if (!_relatedEntities.ContainsKey(lookupTarget) && !requiredEntities.ContainsKey(lookupTarget))
                    {
                        requiredEntities.Add(lookupTarget, new HashSet<string>());
                    }
                }
            }


            return requiredEntities;
        }

        private static Stack<Dictionary<string, HashSet<string>>> SplitRequiredRelatedDataRequests(
            Dictionary<string, HashSet<string>> requiredRelatedData, out bool mergeRequired)
        {
            mergeRequired = false;
            // Split up required related entity data in a way that no request contains more than 300 filters
            var requestStack = new Stack<Dictionary<string, HashSet<string>>>();
            using (var iterator = requiredRelatedData.GetEnumerator())
            {
                // Keep track of how many filters are added
                var currentFilters = 0;
                requestStack.Push(new Dictionary<string, HashSet<string>>());
                // As long as there are still related entity sets to process, loop over those
                while (iterator.MoveNext())
                    // Case 1: We can add the filters to the current request set
                    if (currentFilters + iterator.Current.Value.Count < Settings.Default.FILTER_CAP)
                    {
                        requestStack.Peek().Add(iterator.Current.Key, iterator.Current.Value);
                        currentFilters += iterator.Current.Value.Count;
                    }
                    // Case 2: Adding the current set to the existing request stack exceeds
                    //         the filter size of FILTER_CAP. Create a new request set.
                    else if (currentFilters + iterator.Current.Value.Count >= Settings.Default.FILTER_CAP)
                    {
                        requestStack.Push(new Dictionary<string, HashSet<string>>());
                        // Case a: The required attributes of this related entity alone
                        //         already exceed the maximum request set size
                        if (iterator.Current.Value.Count >= Settings.Default.FILTER_CAP)
                        {
                            requestStack.Peek().Add(iterator.Current.Key, new HashSet<string>());
                            using (var internalIterator = iterator.Current.Value.GetEnumerator())
                            {
                                mergeRequired = true;
                                while (internalIterator.MoveNext())
                                {
                                    if (requestStack.Peek()[iterator.Current.Key].Count >= Settings.Default.FILTER_CAP)
                                        requestStack.Push(new Dictionary<string, HashSet<string>>
                                        {
                                            {
                                                iterator.Current.Key, new HashSet<string>()
                                            }
                                        });
                                    requestStack.Peek()[iterator.Current.Key].Add(internalIterator.Current);
                                }
                            }
                        }
                        // Case b: The required attributes of this related entity fit
                        //         into one request set
                        else
                        {
                            requestStack.Peek().Add(iterator.Current.Key, iterator.Current.Value);
                        }

                        currentFilters = requestStack.Peek().Values.Count;
                    }
            }

            return requestStack;
        }
    }
}