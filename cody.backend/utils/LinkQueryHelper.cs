using System;
using System.Linq;
using Microsoft.Xrm.Sdk;

namespace utils
{
    public static class LinkQueryHelper
    {
        public static bool TryGetLinkedEntity<T>(this Entity entity, out T linkedEntity, string alias, string idAttribute) where T: Entity
        {
            var links = entity.Attributes.Keys
                .Where(key => key.StartsWith(alias))
                .Select(key => entity.Attributes[key])
                .OfType<AliasedValue>().ToList();
            var logicalName = links.FirstOrDefault()?.EntityLogicalName;
            if (string.IsNullOrWhiteSpace(logicalName))
            {
                linkedEntity = default;
                return false;
            }
            var rawEntity = new Entity(logicalName);
            foreach (var aliasedValue in links)
            {
                rawEntity.Attributes[aliasedValue.AttributeLogicalName] = aliasedValue.Value;
                if (aliasedValue.AttributeLogicalName == idAttribute)
                {
                    rawEntity.Id = (Guid)aliasedValue.Value;
                }
            }
            linkedEntity = rawEntity.ToEntity<T>();
            return true;
        }
    }
}
