using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Builder.TS.Attributes;
using proxygenerator.Data.Builder.TS.Collections;
using proxygenerator.Data.Builder.TS.OptionSets;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Data.Model.OptionSets;
using proxygenerator.Generators;
using proxygenerator.Utils;
using Scriban.Functions;

namespace proxygenerator.Data.Builder.TS
{
    public class EntityBuilder : IEntityBuilder
    {
        private readonly EntityMetadataCache _cache;

        public EntityBuilder(EntityMetadataCache cache)
        {
            _cache = cache;
        }

        public EntityData ConstructEntity(EntityMetadata metadata)
        {
            #region MetadataValidation

            if (metadata.Attributes == null) throw new Exception("Attributes is null for " + metadata.LogicalName);

            #endregion

            var entityData = GetBaseEntity(metadata);

            var optionSetAttributeMetadata = metadata.Attributes.OfType<EnumAttributeMetadata>()
                .Where(a => a.OptionSet != null).Distinct().ToList();
            entityData.ExternalOptionSets = GetExternalOptionSets(optionSetAttributeMetadata);
            entityData.InternalOptionSets = GetInternalOptionSets(optionSetAttributeMetadata);
            DeduplicateOptionSets(entityData.InternalOptionSets, entityData.ExternalOptionSets);

            entityData.Attributes =
                GetAttributes(metadata, entityData.ExternalOptionSets.Concat(entityData.InternalOptionSets));
            DeduplicateAttributes(entityData.Attributes);

            #region Collections

            entityData.CollectionFetchers = GetCollectionFetchers(metadata);
            DeduplicateCollectionFetchers(entityData.CollectionFetchers);

            entityData.IntersectFetchers = GetIntersectFetchers(metadata, entityData);
            DeduplicateIntersectFetchers(entityData.IntersectFetchers, entityData.CollectionFetchers);

            #endregion

            return entityData;
        }

        public RelatedEntityData ConstructRelatedEntity(EntityMetadata metadata)
        {
            var entity = GetBaseEntity(metadata);
            var attributeBuilder = new AttributeBuilder();
            entity.Attributes = metadata.Attributes.Select(attr => attributeBuilder.BuildAttribute(attr)).ToList();
            return entity;
        }

        private EntityData GetBaseEntity(EntityMetadata metadata)
        {
            var entityData = new EntityData
            {
                Generate = !((metadata.IsIntersect ?? false) || metadata.PrimaryIdAttribute == null ||
                             metadata.PrimaryNameAttribute == null),
                DisplayName = metadata.GetDisplayName() ?? "No Display Name",
                DisplayCollectionName = metadata.GetDisplayCollectionName() ?? "No Display Name",
                LogicalName = metadata.LogicalName,
                SchemaName = metadata.SchemaName,
                EntitySetName = metadata.EntitySetName,
                ClassName = !string.IsNullOrWhiteSpace(metadata.GetDisplayName())
                    ? Regex.Replace(StringFunctions.Capitalizewords(metadata.GetDisplayName()), "[^A-Za-z0-9_]",
                        string.Empty)
                    : metadata.LogicalName,
                MetadataId = metadata.MetadataId ?? Guid.Empty,
                PrimaryIdAttributeName = metadata.PrimaryIdAttribute,
                PrimaryNameAttributeName = metadata.PrimaryNameAttribute,
                ObjectTypeCode = metadata.ObjectTypeCode,
                ClassComment = new Comment(metadata.GetDescription())
            };
            entityData.ClassComment.CommentParameters.Add(new CommentParameter("logicalName", entityData.LogicalName));
            entityData.ClassComment.CommentParameters.Add(new CommentParameter("displayName", entityData.DisplayName));
            if (metadata.IsManaged == true)
                entityData.ClassComment.CommentParameters.Add(new CommentParameter("managed", string.Empty));
            return entityData;
        }

        #region OptionSets

        private List<OptionSetData> GetExternalOptionSets(IEnumerable<EnumAttributeMetadata> optionSetAttributes)
        {
            var optionSetBuilder = new OptionSetBuilder();
            var externalOptionSets = optionSetAttributes.Where(a => a.OptionSet?.IsGlobal == true)
                .GroupBy(a => a.OptionSet.MetadataId).Select(g => g.First())
                .Select(a => optionSetBuilder.BuildOptionSet(a.OptionSet)).ToList();
            return externalOptionSets;
        }

        private List<OptionSetData> GetInternalOptionSets(IEnumerable<EnumAttributeMetadata> optionSetAttributes)
        {
            var optionSetBuilder = new OptionSetBuilder();
            var enumAttributes = optionSetAttributes.ToList();
            var internalOptionSets = enumAttributes
                .Where(a => a.OptionSet?.IsGlobal == false &&
                            !(a is StatusAttributeMetadata || a is StateAttributeMetadata))
                .GroupBy(a => a.OptionSet.MetadataId).Select(g => g.First())
                .Select(a => optionSetBuilder.BuildOptionSet(a.OptionSet)).ToList().ToList();
            var statusMetadata = enumAttributes.OfType<StateAttributeMetadata>().FirstOrDefault();
            // ReSharper disable once InvertIf
            if (statusMetadata != null)
            {
                var statusOptionData = optionSetBuilder.BuildOptionSet(statusMetadata.OptionSet);
                //statusOptionData.EnumName = statusOptionData.InternalEnumName = $"e{Attributes.Find(a => a.MetadataId.Equals(statusMetadata.MetadataId)).CodeName}";
                internalOptionSets.Add(statusOptionData);
                var statusReasonMetadata =
                    enumAttributes.OfType<StatusAttributeMetadata>().FirstOrDefault();
                // ReSharper disable once InvertIf
                if (statusReasonMetadata != null)
                {
                    var srData =
                        optionSetBuilder.BuildStatusReasonOptionSet(statusReasonMetadata.OptionSet, statusOptionData);
                    internalOptionSets.Add(srData);
                }
            }

            return internalOptionSets;
        }

        private void DeduplicateOptionSets(IReadOnlyList<OptionSetData> internalOptionSets,
            IReadOnlyList<OptionSetData> externalOptionSets)
        {
            DeduplicateExternalOptionSets(externalOptionSets);
            DeduplicateInternalOptionSets(internalOptionSets, externalOptionSets);
        }

        private void DeduplicateExternalOptionSets(IReadOnlyList<OptionSetData> externalOptionSets)
        {
            for (var i = externalOptionSets.Count - 1; i >= 0; i--)
            {
                var optionSetData = externalOptionSets[i];
                var duplicatesInternal =
                    externalOptionSets.Count(dup => dup.InternalEnumName == optionSetData.InternalEnumName);
                if (duplicatesInternal <= 1) continue;
                optionSetData.InternalEnumName += duplicatesInternal;
                optionSetData.ExposedEnumName += duplicatesInternal;
            }
        }

        private void DeduplicateInternalOptionSets(IReadOnlyList<OptionSetData> internalOptionSets,
            IReadOnlyList<OptionSetData> externalOptionSets)
        {
            foreach (var duplicateInternalOptionSets in internalOptionSets.GroupBy(os => os.EnumName))
            {
                var externalEnumDupCount = externalOptionSets.Count(externalOptionSet =>
                    externalOptionSet.EnumName == duplicateInternalOptionSets.Key);
                var internalDups = duplicateInternalOptionSets.ToList();
                for (var i = 0; i < internalDups.Count; i++)
                    if (externalEnumDupCount + i > 0)
                        internalDups[i].ExposedEnumName =
                            internalDups[i].InternalEnumName += externalEnumDupCount + i + 1;
            }
        }

        #endregion

        #region Attributes

        private readonly string[] _artificialOwnerAttributes =
        {
            "owningteam",
            "owninguser",
            "owningbusinessunit"
        };

        private List<AttributeData> GetAttributes(EntityMetadata metadata, IEnumerable<OptionSetData> entityOptionSets)
        {
            var internalEntityOptionSets = entityOptionSets.ToList();
            var attributes = new List<AttributeData>();
            var attributeBuilder = new AttributeBuilder();
            foreach (var attribute in metadata.Attributes.OrderBy(a => a.LogicalName))
            {
                AttributeData data;
                switch (attribute)
                {
                    case DateTimeAttributeMetadata dateTimeAttributeMetadata:
                        data = attributeBuilder.BuildDateTimeAttribute(dateTimeAttributeMetadata);
                        break;
                    case LookupAttributeMetadata ownerLookupAttributeMetadata when ownerLookupAttributeMetadata.AttributeType == AttributeTypeCode.Owner:
                        var artificialAttributes = metadata.Attributes.OfType<LookupAttributeMetadata>().Where(attr => _artificialOwnerAttributes.Contains(attr.LogicalName));
                        var ownerRelationships = artificialAttributes.SelectMany(attr =>
                        {
                            return metadata.ManyToOneRelationships?.Where(rel => rel.ReferencingAttribute == attr.LogicalName && attr.Targets.Contains(rel.ReferencedEntity)).Select(relationshipMetadata =>
                            (relationship: relationshipMetadata,
                                relatedEntity: _cache.GetRelatedEntity(relationshipMetadata.ReferencedEntity)));
                        });
                        data = attributeBuilder.BuildLookupAttribute(ownerLookupAttributeMetadata, ownerRelationships);
                        break;
                    case LookupAttributeMetadata partyLookupAttributeMetadata when partyLookupAttributeMetadata.AttributeType == AttributeTypeCode.PartyList:
                        var targetEntities = partyLookupAttributeMetadata.Targets.Select(target => _cache.GetRelatedEntity(target));
                        data = attributeBuilder.BuildPartyListAttribute(partyLookupAttributeMetadata, targetEntities);
                        break;
                    case LookupAttributeMetadata lookupAttributeMetadata:
                        if (_artificialOwnerAttributes.Contains(attribute.LogicalName)) continue;
                        var relationships = metadata.ManyToOneRelationships?.Where(rel =>
                            rel.ReferencingAttribute == attribute.LogicalName && lookupAttributeMetadata.Targets.Contains(rel.ReferencedEntity)).Select(relationshipMetadata =>
                            (relationship: relationshipMetadata,
                                relatedEntity: _cache.GetRelatedEntity(relationshipMetadata.ReferencedEntity))).ToList();
                        if (relationships == null || relationships.Count() == 0) continue;
                        data = attributeBuilder.BuildLookupAttribute(lookupAttributeMetadata, relationships);
                        break;
                    case EnumAttributeMetadata pickListAttributeMetadata
                        when !(pickListAttributeMetadata is EntityNameAttributeMetadata):
                        var optionSet = internalEntityOptionSets.First(os =>
                            os.LogicalName == pickListAttributeMetadata.OptionSet.Name);
                        data = attributeBuilder.BuildOptionSetAttribute(pickListAttributeMetadata, optionSet);
                        break;
                    case BooleanAttributeMetadata booleanAttributeMetadata:
                        data = attributeBuilder.BuildBooleanAttribute(booleanAttributeMetadata);
                        break;
                    case DecimalAttributeMetadata decimalAttributeMetadata:
                        data = attributeBuilder.BuildNumericAttribute(decimalAttributeMetadata);
                        break;
                    case DoubleAttributeMetadata doubleAttributeMetadata:
                        data = attributeBuilder.BuildNumericAttribute(doubleAttributeMetadata);
                        break;
                    case IntegerAttributeMetadata integerAttributeMetadata:
                        data = attributeBuilder.BuildNumericAttribute(integerAttributeMetadata);
                        break;
                    case MoneyAttributeMetadata moneyAttributeMetadata:
                        data = attributeBuilder.BuildNumericAttribute(moneyAttributeMetadata);
                        break;
                    case BigIntAttributeMetadata bigIntAttributeMetadata:
                        data = attributeBuilder.BuildNumericAttribute(bigIntAttributeMetadata);
                        break;
                    case StringAttributeMetadata stringAttributeMetadata:
                        data = attributeBuilder.BuildStringAttribute(stringAttributeMetadata);
                        break;
                    default:
                        data = attributeBuilder.BuildAttribute(attribute);
                        break;
                }

                attributes.Add(data);
            }

            return attributes;
        }

        private void DeduplicateAttributes(IReadOnlyList<AttributeData> attributes)
        {
            var attributesToCheckForDuplicates = attributes.Where(a => a.Generate).ToList();
            foreach (var conflictingAttributeGroup in attributesToCheckForDuplicates.GroupBy(attribute =>
                attribute.CodeName))
            {
                var conflictingAttributes = conflictingAttributeGroup.ToList();
                for (var i = 1; i < conflictingAttributes.ToList().Count; i++)
                {
                    var conflictedAttribute = conflictingAttributes[i];
                    conflictedAttribute.CodeName += i + 1;
                    conflictedAttribute.Getter.PropertyName += i + 1;
                    conflictedAttribute.Setter.PropertyName += i + 1;
                    conflictedAttribute.FormattedGetter.PropertyName = Regex.Replace(
                        conflictedAttribute.FormattedGetter.PropertyName,
                        "_Formatted$", $"{i + 1}_Formatted");
                }
            }
        }

        #endregion

        #region Collections

        private List<CollectionFetcherData> GetCollectionFetchers(EntityMetadata metadata)
        {
            var collectionFetcherBuilder = new CollectionFetcherBuilder();
            var collectionFetchers = new List<CollectionFetcherData>(
                metadata.OneToManyRelationships?.Select(otm =>
                    collectionFetcherBuilder.BuildCollectionFetcher(otm,
                        _cache.GetRelatedEntity(otm.ReferencingEntity)))
                ?? Array.Empty<CollectionFetcherData>());
            return collectionFetchers;
        }

        private void DeduplicateCollectionFetchers(IEnumerable<CollectionFetcherData> collectionFetchers)
        {
            var internalCollectionFetchers = collectionFetchers.Where(cfd => cfd.Generate).ToList();
            var conflictingCollectionFetchers =
                internalCollectionFetchers.GroupBy(cfd => cfd.RelatedAttributeCodeName + cfd.CollectionEntityPluralCodeName);
            foreach (var conflictingCollectionFetcherGroup in conflictingCollectionFetchers)
            {
                var duplicateFetchers = conflictingCollectionFetcherGroup.ToList();
                for (var i = 1; i < duplicateFetchers.Count; i++)
                {
                    var conflictedFetcher = duplicateFetchers[i];
                    conflictedFetcher.RelatedAttributeCodeName += i + 1;
                }
            }
        }

        private List<IntersectFetcherData> GetIntersectFetchers(EntityMetadata metadata, EntityData entityData)
        {
            var intersectFetcherBuilder = new IntersectFetcherBuilder();
            var fetchers = metadata.ManyToManyRelationships.Select(mtm =>
            {
                RelatedEntityData relatedEntity;
                if (mtm.Entity2LogicalName == mtm.Entity1LogicalName && mtm.Entity1LogicalName == metadata.LogicalName)
                    relatedEntity = entityData;
                else if (mtm.Entity2LogicalName == entityData.LogicalName)
                    relatedEntity = _cache.GetRelatedEntity(mtm.Entity1LogicalName);
                else
                    relatedEntity = _cache.GetRelatedEntity(mtm.Entity2LogicalName);
                return intersectFetcherBuilder.BuildIntersectFetcher(mtm, entityData, relatedEntity);
            }).ToList();
            return fetchers;
        }

        private void DeduplicateIntersectFetchers(IEnumerable<IntersectFetcherData> intersectFetchers,
            IEnumerable<CollectionFetcherData> collectionFetchers)
        {
            var conflictingIntersectFetcherGroups =
                intersectFetchers.GroupBy(ifd => ifd.RelatedEntityCollectionCodeName);
            var internalCollectionFetchers = collectionFetchers.ToList();
            foreach (var conflictingIntersectFetcherGroup in conflictingIntersectFetcherGroups)
            {
                var conflictingIntersectFetchers = conflictingIntersectFetcherGroup.ToList();
                var conflictingCollectionFetchers = internalCollectionFetchers.Count(cfd =>
                    cfd.CollectionEntityPluralCodeName == "Associated" && cfd.RelatedAttributeCodeName ==
                    conflictingIntersectFetchers[0].RelatedEntityCollectionCodeName);
                for (var i = 0; i < conflictingIntersectFetchers.Count; i++)
                {
                    if (conflictingCollectionFetchers + i + 1 <= 1) continue;
                    var conflictedIntersectFetcher = conflictingIntersectFetchers[i];
                    conflictedIntersectFetcher.RelatedEntityCollectionCodeName += conflictingCollectionFetchers + i + 1;
                }
            }
        }

        #endregion
    }
}