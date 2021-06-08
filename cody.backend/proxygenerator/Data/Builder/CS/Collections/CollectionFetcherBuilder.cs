using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Generators;
using Scriban.Functions;

namespace proxygenerator.Data.Builder.CS.Collections
{
    public class CollectionFetcherBuilder
    {
        public CollectionFetcherData BuildCollectionFetcher(OneToManyRelationshipMetadata metadata,
            RelatedEntityData relatedEntity, List<string> availableRelatedTypes)
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
            if (availableRelatedTypes.Contains(data.RelatedEntityLogicalName))
            {
                data.CollectionEntityClassName =
                    !string.IsNullOrWhiteSpace(relatedEntity.DisplayName)
                        ? Regex.Replace(StringFunctions.Capitalizewords(relatedEntity.DisplayName), "\\W",
                            string.Empty)
                        : relatedEntity.LogicalName;
            }
            else
            {
                data.CollectionEntityClassName = "Entity";
            }
            var attribute = relatedEntity.Attributes.Find(attr => attr.LogicalName == metadata.ReferencingAttribute);
            if (attribute == null || attribute.AttributeType == "PartyList")
            {
                data.Generate = false;
            }
            else
            {
                data.RelatedAttributeDisplayName = attribute.DisplayName;
                data.RelatedAttributeName = attribute.DisplayName;
                data.RelatedAttributeCodeName = attribute.CodeName;
                data.Generate = true;
                data.Comment = new Comment(null, new CommentParameter("para", $"<b>{relatedEntity.DisplayName} ({attribute.DisplayName})</b>"),
                    new CommentParameter("para", $"Schema Name: {metadata.SchemaName}"));
            }

            return data;
        }
    }
}