using System;
using System.Text.RegularExpressions;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Generators;
using Scriban.Functions;

namespace proxygenerator.Data.Builder.TS.Collections
{
    public class CollectionFetcherBuilder
    {
        public CollectionFetcherData BuildCollectionFetcher(OneToManyRelationshipMetadata metadata,
            RelatedEntityData relatedEntity)
        {
            var data = new CollectionFetcherData();
            data.MetadataId = metadata.MetadataId ?? Guid.Empty;
            data.RelatedAttributeLogicalName = metadata.ReferencingAttribute;
            data.RelatedEntityLogicalName = metadata.ReferencingEntity;
            data.CollectionEntityPluralDisplayName = relatedEntity.DisplayCollectionName;
            data.RelatedEntitySetName = relatedEntity.EntitySetName;
            data.CollectionEntityPluralCodeName =
                StringFunctions.Capitalizewords(Regex.Replace(
                    data.CollectionEntityPluralDisplayName ?? relatedEntity.LogicalName,
                    "[^A-Za-z]", ""));
            var attribute = relatedEntity.Attributes.Find(attr => attr.LogicalName == metadata.ReferencingAttribute);
            if (attribute == null || attribute.AttributeType == "PartyList")
            {
                data.Generate = false;
            }
            else
            {
                data.Comment = new Comment(null, new CommentParameter("relatedAttribute", attribute.LogicalName),
                    new CommentParameter("relatedEntity", relatedEntity.LogicalName));
                data.RelatedAttributeDisplayName = attribute.DisplayName;
                data.RelatedAttributeName = attribute.DisplayName;
                data.RelatedAttributeCodeName = attribute.CodeName;
                data.Generate = true;
            }

            return data;
        }
    }
}