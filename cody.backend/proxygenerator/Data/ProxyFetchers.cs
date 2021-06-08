using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata.Query;
using Microsoft.Xrm.Sdk.Query;
using Newtonsoft.Json;

namespace proxygenerator.Data
{
    public class ProxyFetchers
    {
        [JsonObject]
        public class AvailableActionResult
        {
            public string Name { get; set; }
            public string DisplayName { get; set; }
            public string PrimaryEntityName { get; set; }
        }

        public static IEnumerable<AvailableActionResult> AvailableActions(IOrganizationService organizationService)
        {
            var query = new QueryExpression("workflow");
            query.Criteria.AddCondition("category", ConditionOperator.Equal, 3); // Only actions
            query.ColumnSet.AddColumns("uniquename", "primaryentity", "name");
            var messageQuery = query.AddLink("sdkmessage", "sdkmessageid", "sdkmessageid");
            messageQuery.EntityAlias = "message";
            messageQuery.Columns.AddColumns("name");
            var actions = organizationService.RetrieveMultiple(query);
            return actions.Entities
                .Select(action =>
                {
                    var name = (action["message.name"] as AliasedValue)?.Value.ToString();
                    var displayName = action["name"] as string;
                    var primaryEntityName = action["primaryentity"] is string primaryEntity && primaryEntity != "none"
                        ? primaryEntity
                        : null;
                    return new AvailableActionResult
                    {
                        Name = name,
                        DisplayName = displayName,
                        PrimaryEntityName = primaryEntityName
                    };
                })
                .GroupBy(result => result.Name)
                .Select(grp => grp.First());
        }

        [JsonObject]
        public class AvailableEntityResult
        {
            public string LogicalName { get; set; }
            public string DisplayName { get; set; }
            public string Description { get; set; }
        }

        public static IEnumerable<AvailableEntityResult> AvailableEntities(IOrganizationService organizationService)
        {
            var request = new RetrieveMetadataChangesRequest
            {
                Query = new EntityQueryExpression
                {
                    Criteria = new MetadataFilterExpression(LogicalOperator.And)
                    {
                        Conditions =
                        {
                            new MetadataConditionExpression("IsPrivate",
                                MetadataConditionOperator.Equals, false),
                            new MetadataConditionExpression("IsIntersect",
                                MetadataConditionOperator.Equals, false),
                            new MetadataConditionExpression("IsBPFEntity",
                                MetadataConditionOperator.Equals, false)
                        }
                    },
                    Properties = new MetadataPropertiesExpression("LogicalName", "DisplayName", "Description")
                }
            };
            return !(organizationService.Execute(request) is RetrieveMetadataChangesResponse newResponse)
                ? throw new Exception("No response")
                : newResponse.EntityMetadata.Select(em => new AvailableEntityResult
                {
                    DisplayName = em.DisplayName?.UserLocalizedLabel?.Label,
                    Description = em.Description?.UserLocalizedLabel?.Label, LogicalName = em.LogicalName
                }).OrderBy(em => em.LogicalName).ToList();
        }
    }
}