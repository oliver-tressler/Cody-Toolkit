using System;
using System.Text.RegularExpressions;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Generators;
using static Scriban.Functions.StringFunctions;

namespace proxygenerator.Data.Builder.TS.Collections
{
    public class IntersectFetcherBuilder
    {
        public IntersectFetcherData BuildIntersectFetcher(ManyToManyRelationshipMetadata metadata, EntityData entity,
            RelatedEntityData relatedEntity)
        {
            var data = new IntersectFetcherData();
            data.Generate = true;
            data.EntityLogicalName = entity.LogicalName;
            data.RelatedEntityLogicalName = relatedEntity.LogicalName;
            data.RelationShipName = metadata.IntersectEntityName;
            data.MetadataId = metadata.MetadataId ?? Guid.Empty;
            data.EntitySetName = entity.EntitySetName;
            data.RelatedEntityCollectionCodeName = Capitalizewords(Regex.Replace(
                relatedEntity.DisplayCollectionName ?? relatedEntity.LogicalName,
                "[^A-Za-z]", ""));
            data.Comment = new Comment(null, new CommentParameter("relatedBy", metadata.IntersectEntityName));
            return data;
        }
    }
}