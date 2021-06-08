using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace utils.proxies
{
    public static class FetchHelper
    {
        public static T RetrieveProxy<T>(this EntityReference reference, IOrganizationService service, ColumnSet columnSet = null) where T : Entity
        {
            return service.RetrieveProxy<T>(reference.LogicalName, reference.Id, columnSet);
        }

        public static T RetrieveProxy<T>(this EntityReference reference, IOrganizationService service, params string[] fields) where T : Entity
        {
            return service.RetrieveProxy<T>(reference.LogicalName, reference.Id, fields);
        }


        public static T RetrieveProxy<T>(this IOrganizationService service, EntityReference reference, ColumnSet columnSet = null) where T : Entity
        {
            return service.RetrieveProxy<T>(reference.LogicalName, reference.Id, columnSet ?? new ColumnSet(true)).ToEntity<T>();
        }

        public static T RetrieveProxy<T>(this IOrganizationService service, EntityReference reference, params string[] fields) where T : Entity
        {
            return service.RetrieveProxy<T>(reference.LogicalName, reference.Id, fields).ToEntity<T>();
        }


        public static T RetrieveProxy<T>(this IOrganizationService service, Entity entity, ColumnSet columnSet = null) where T : Entity
        {
            return service.RetrieveProxy<T>(entity.LogicalName, entity.Id, columnSet ?? new ColumnSet(true)).ToEntity<T>();
        }

        public static T RetrieveProxy<T>(this IOrganizationService service, Entity entity, params string[] fields) where T : Entity
        {
            return service.RetrieveProxy<T>(entity.LogicalName, entity.Id, fields).ToEntity<T>();
        }

        public static T RetrieveProxy<T>(this IOrganizationService service, string logicalName, Guid id, ColumnSet columnSet) where T : Entity
        {
            return service.Retrieve(logicalName, id, columnSet ?? new ColumnSet(true)).ToEntity<T>();
        }

        public static T RetrieveProxy<T>(this IOrganizationService service, string logicalName, Guid id, params string[] fields) where T : Entity
        {
            return service.RetrieveProxy<T>(logicalName, id, GetColumnSet(fields));
        }


        private static ColumnSet GetColumnSet(string[] columns)
        {
            return columns.Length == 0 ? new ColumnSet(true) : new ColumnSet(columns);
        }

        public static List<T> GetRelatedOneToManyEntities<T>(IOrganizationService service, Guid relatedId, string logicalName, string attributeName, ColumnSet columnSet = null) where T: Entity
        {
            var query = new QueryExpression();
            query.ColumnSet = columnSet ?? new ColumnSet(true);
            query.EntityName = logicalName;
            query.Criteria.AddCondition(new ConditionExpression(attributeName, ConditionOperator.Equal, relatedId));
            return service.RetrieveMultiple(query).Entities.Select(entity => entity.ToEntity<T>()).ToList();
        }
    }
}
