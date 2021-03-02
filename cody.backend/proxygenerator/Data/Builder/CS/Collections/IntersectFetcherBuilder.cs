using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Generators;
using static Scriban.Functions.StringFunctions;

namespace proxygenerator.Data.Builder.CS.Collections
{
    public class IntersectFetcherBuilder
    {
        public IntersectFetcherData BuildIntersectFetcher(ManyToManyRelationshipMetadata metadata, EntityData entity,
            RelatedEntityData relatedEntity, List<string> availableRelatedTypes)
        {
            var data = new IntersectFetcherData
            {
                MetadataId = metadata.MetadataId ?? Guid.Empty,
                EntityLogicalName = entity.LogicalName,
                EntitySetName = entity.EntitySetName,
                EntityClassName = !string.IsNullOrWhiteSpace(entity.DisplayName)
                    ? Regex.Replace(Capitalizewords(entity.DisplayName), "\\W",
                        string.Empty)
                    : entity.LogicalName,
                EntityCollectionCodeName = Capitalizewords(Regex.Replace(
                    entity.DisplayCollectionName ?? entity.LogicalName,
                    "[^A-Za-z]", "")),
                EntityAttribute = entity.PrimaryIdAttributeName, // TODO: Come up with counterexample
                RelationEntityAttribute = entity.LogicalName == metadata.Entity1LogicalName
                    ? metadata.Entity1IntersectAttribute
                    : metadata.Entity2IntersectAttribute,
                RelationShipName = metadata.SchemaName,
                RelationEntityLogicalName = metadata.IntersectEntityName,
                RelationRelatedEntityAttribute = entity.LogicalName == metadata.Entity2LogicalName
                    ? metadata.Entity2IntersectAttribute
                    : metadata.Entity1IntersectAttribute,
                RelatedEntityLogicalName = relatedEntity.LogicalName,
                RelatedEntityCollectionCodeName = Capitalizewords(Regex.Replace(
                    relatedEntity.DisplayCollectionName ?? relatedEntity.LogicalName,
                    "[^A-Za-z]", "")),
                RelatedEntityClassName = availableRelatedTypes.Contains(relatedEntity.LogicalName)
                    ? !string.IsNullOrWhiteSpace(relatedEntity.DisplayName)
                        ? Regex.Replace(Capitalizewords(relatedEntity.DisplayName), "\\W",
                            string.Empty)
                        : relatedEntity.LogicalName
                    : "Entity",
                RelatedEntityAttribute = relatedEntity.PrimaryIdAttributeName, // TODO: Come up with counterexample
                Comment = new Comment(null,
                    new CommentParameter("para", $"Related Entity: <b>{relatedEntity.DisplayName}</b>"),
                    new CommentParameter("para", "N:N Relationship"),
                    new CommentParameter("para", $"Schema Name: {metadata.SchemaName}")),
                Generate = true
            };

            return data;
        }
    }
}