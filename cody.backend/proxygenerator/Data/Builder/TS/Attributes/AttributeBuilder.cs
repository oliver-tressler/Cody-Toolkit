using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Data.Model.OptionSets;
using proxygenerator.Generators;
using proxygenerator.Utils;
using Scriban.Functions;

namespace proxygenerator.Data.Builder.TS.Attributes
{
    public class AttributeBuilder : IAttributeBuilder
    {
        private void BuildBaseAttribute<T>(AttributeMetadata metadata, ref T attributeData) where T : AttributeData
        {
            attributeData.MetadataId = metadata.MetadataId ?? Guid.Empty;
            attributeData.LogicalName = metadata.LogicalName;
            attributeData.AttributeType = Enum.GetName(typeof(AttributeTypeCode),
                metadata.AttributeType ?? throw new InvalidEnumArgumentException("Invalid attribute type"));
            attributeData.AttributeTypeCode = (int)(metadata.AttributeType ??
                                                     throw new InvalidEnumArgumentException("Invalid attribute type"));
            attributeData.SchemaName = metadata.SchemaName;
            //$0.name | string.replace " " "" | regex.replace "[^A-Za-z0-9]+" "_" | regex.replace "_$" ""
            var internalDisplayName = metadata.GetDisplayName();
            attributeData.DisplayName = internalDisplayName ?? "No Display Name";
            attributeData.CodeName = internalDisplayName == null
                ? attributeData.LogicalName
                : Regex.Replace(
                    Regex.Replace(
                        Regex.Replace(StringFunctions.Capitalizewords(internalDisplayName), " ", ""),
                        "[^A-Za-z0-9]", "_"), "_$", "");
            attributeData.ODataRequestName = metadata.LogicalName;
            attributeData.Generate = string.IsNullOrWhiteSpace(metadata.AttributeOf) ||
                                     (metadata.IsPrimaryId ?? false) || (metadata.IsPrimaryName ?? false);
        }

        public AttributeData BuildAttribute(AttributeMetadata metadata)
        {
            var attributeData = new AttributeData();
            BuildBaseAttribute(metadata, ref attributeData);
            (attributeData.Getter, attributeData.FormattedGetter, attributeData.Setter) =
                GetStandardPropertySet(attributeData, metadata);
            return attributeData;
        }

        public DateTimeAttributeData BuildDateTimeAttribute(DateTimeAttributeMetadata metadata)
        {
            var attributeData = new DateTimeAttributeData();
            BuildBaseAttribute(metadata, ref attributeData);
            attributeData.DateTimeTypeName = metadata.DateTimeBehavior.Value;
            switch (metadata.DateTimeBehavior.Value)
            {
                case "UserLocal":
                    attributeData.DateTimeType = DateTimeType.UserLocal;
                    break;
                case "DateOnly":
                    attributeData.DateTimeType = DateTimeType.DateOnly;
                    break;
                case "TimeZoneIndependent":
                    attributeData.DateTimeType = DateTimeType.TimeZoneIndependent;
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(metadata.DateTimeBehavior));
            }
            (attributeData.Getter, attributeData.FormattedGetter, attributeData.Setter) =
                GetStandardPropertySet(attributeData, metadata);
            attributeData.Getter.Comment.CommentParameters.Add(new CommentParameter("behavior",
                attributeData.DateTimeTypeName));
            attributeData.FormattedGetter.Comment.CommentParameters.Add(new CommentParameter("behavior",
                attributeData.DateTimeTypeName));
            return attributeData;
        }

        public LookupAttributeData BuildLookupAttribute(LookupAttributeMetadata metadata,
            IEnumerable<(OneToManyRelationshipMetadata relationship, RelatedEntityData relatedEntity)> relationships)
        {
            var attributeData = new LookupAttributeData();
            BuildBaseAttribute(metadata, ref attributeData);
            attributeData.ODataRequestName = $"_{attributeData.ODataRequestName}_value";
            attributeData.RelationData = relationships.Select(info =>
            {
                var relatedAttribute = info.relatedEntity.Attributes.FirstOrDefault(a => a.LogicalName == info.relationship.ReferencedAttribute) ?? 
                    throw new Exception($"Unable to find attribute {info.relationship.ReferencedAttribute} on related entity {info.relatedEntity.LogicalName} for relationship {info.relationship.SchemaName}");
                return new LookupRelationData
                {
                    //RelationShipSchemaName = info.relationship.SchemaName,
                    ReferencedEntityLogicalName = info.relationship.ReferencedEntity,
                    ReferencedAttributeLogicalName = info.relationship.ReferencedAttribute,
                    ReferencedEntitySetName = info.relatedEntity.EntitySetName,
                    ReferencedEntityDisplayName = info.relatedEntity.DisplayName,
                    ReferencedAttributeDisplayName = relatedAttribute.DisplayName
                };
            }).ToArray();
            (attributeData.Getter, attributeData.FormattedGetter, attributeData.Setter) =
                GetStandardPropertySet(attributeData, metadata);

            attributeData.Getter.Comment?.CommentParameters.Add(new CommentParameter(
                attributeData.RelationData.Length > 1 ? "entities" : "entity",
                string.Join(", ",
                    attributeData.RelationData.Select(data => data.ReferencedEntityLogicalName).Distinct())));
            attributeData.FormattedGetter.Comment?.CommentParameters.Add(new CommentParameter(
                attributeData.RelationData.Length > 1 ? "entities" : "entity",
                string.Join(", ",
                    attributeData.RelationData.Select(data => data.ReferencedEntityLogicalName).Distinct())));
            if (attributeData.Getter.Comment != null)
                attributeData.Getter.Comment.MainDescription += Environment.NewLine + "OData not supported";
            return attributeData;
        }

        public AttributeData BuildPartyListAttribute(LookupAttributeMetadata partyLookupAttributeMetadata, IEnumerable<RelatedEntityData> targetEntities)
        {
            var attributeData = new LookupAttributeData();
            BuildBaseAttribute(partyLookupAttributeMetadata, ref attributeData);
            attributeData.RelationData = targetEntities.Select(entity => {
                return new LookupRelationData
                {
                    ReferencedEntityDisplayName = entity.DisplayName,
                    ReferencedEntityLogicalName = entity.LogicalName,
                    ReferencedEntitySetName = entity.EntitySetName
                };
            }).ToArray();
            (attributeData.Getter, attributeData.FormattedGetter, attributeData.Setter) =
                GetStandardPropertySet(attributeData, partyLookupAttributeMetadata);
            attributeData.Getter.Comment?.CommentParameters.Add(new CommentParameter(
                attributeData.RelationData.Length > 1 ? "entities" : "entity",
                string.Join(", ",
                    attributeData.RelationData.Select(data => data.ReferencedEntityLogicalName).Distinct())));
            attributeData.FormattedGetter.Comment?.CommentParameters.Add(new CommentParameter(
                attributeData.RelationData.Length > 1 ? "entities" : "entity",
                string.Join(", ",
                    attributeData.RelationData.Select(data => data.ReferencedEntityLogicalName).Distinct())));
            return attributeData;
        }

        public OptionSetAttributeData BuildOptionSetAttribute(EnumAttributeMetadata metadata, OptionSetData optionSet)
        {
            var attributeData = new OptionSetAttributeData();
            BuildBaseAttribute(metadata, ref attributeData);
            attributeData.OptionSet = optionSet;
            (attributeData.Getter, attributeData.FormattedGetter, attributeData.Setter) =
                GetOptionSetPropertySet(attributeData, metadata);
            return attributeData;
        }

        public AttributeData BuildBooleanAttribute(BooleanAttributeMetadata metadata)
        {
            var attributeData = BuildAttribute(metadata);
            if (attributeData == null) return null;
            if (metadata.OptionSet?.TrueOption != null)
            {
                var paramTexts = new[]
                {
                    metadata.OptionSet.TrueOption.Label?.UserLocalizedLabel?.Label,
                    metadata.OptionSet.TrueOption.Description?.UserLocalizedLabel?.Label
                }.Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
                if (metadata.DefaultValue == true)
                {
                    paramTexts.Add("default");
                }
                var commentParameter = new CommentParameter("true", string.Join(" - ", paramTexts));
                attributeData.Getter.Comment.CommentParameters.Add(commentParameter);
                attributeData.FormattedGetter.Comment.CommentParameters.Add(commentParameter);
            }
            if (metadata.OptionSet?.FalseOption != null)
            {
                var paramTexts = new[]
                {
                    metadata.OptionSet.FalseOption.Label?.UserLocalizedLabel?.Label,
                    metadata.OptionSet.FalseOption.Description?.UserLocalizedLabel?.Label
                }.Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
                if (metadata.DefaultValue == false)
                {
                    paramTexts.Add("default");
                }
                var commentParameter = new CommentParameter("false", string.Join(" - ", paramTexts));
                attributeData.Getter.Comment.CommentParameters.Add(commentParameter);
                attributeData.FormattedGetter.Comment.CommentParameters.Add(commentParameter);
            }

            return attributeData;
        }

        public AttributeData BuildNumericAttribute(BigIntAttributeMetadata metadata)
        {
            var commentParameters = new[]
            {
                new CommentParameter("min", metadata.MinValue?.ToString() ?? long.MinValue.ToString()),
                new CommentParameter("max", metadata.MaxValue?.ToString() ?? long.MaxValue.ToString()),
            };
            return BuildNumericAttribute(metadata, commentParameters);
        }

        public AttributeData BuildNumericAttribute(DecimalAttributeMetadata metadata)
        {
            var commentParameters = new[]
            {
                new CommentParameter("min", metadata.MinValue?.ToString() ?? decimal.MinValue.ToString(CultureInfo.CurrentCulture)),
                new CommentParameter("max", metadata.MaxValue?.ToString() ?? decimal.MaxValue.ToString(CultureInfo.CurrentCulture)),
                new CommentParameter("precision", metadata.Precision?.ToString() ?? "2"),
            };
            return BuildNumericAttribute(metadata, commentParameters);
        }

        public AttributeData BuildNumericAttribute(DoubleAttributeMetadata metadata)
        {
            var commentParameters = new[]
            {
                new CommentParameter("min", metadata.MinValue?.ToString() ?? double.MinValue.ToString(CultureInfo.CurrentCulture)),
                new CommentParameter("max", metadata.MaxValue?.ToString() ?? double.MaxValue.ToString(CultureInfo.CurrentCulture)),
                new CommentParameter("precision", metadata.Precision?.ToString() ?? "2"),
            };
            return BuildNumericAttribute(metadata, commentParameters);
        }

        public AttributeData BuildNumericAttribute(IntegerAttributeMetadata metadata)
        {
            var commentParameters = new List<CommentParameter>
            {
                new CommentParameter("min", metadata.MinValue?.ToString() ?? int.MinValue.ToString()),
                new CommentParameter("max", metadata.MaxValue?.ToString() ?? int.MaxValue.ToString()),
            };
            if (metadata.Format != null && metadata.Format != IntegerFormat.None)
            {
                commentParameters.Add(new CommentParameter("format", Enum.GetName(typeof(IntegerFormat), metadata.Format)));
            }
            return BuildNumericAttribute(metadata, commentParameters.ToArray());
        }

        public AttributeData BuildNumericAttribute(MoneyAttributeMetadata metadata)
        {
            var commentParameters = new[]
            {
                new CommentParameter("min", metadata.MinValue?.ToString() ?? "N/A"),
                new CommentParameter("max", metadata.MaxValue?.ToString() ?? "N/A"),
                new CommentParameter("precision", metadata.Precision?.ToString() ?? "2"),
            };
            return BuildNumericAttribute(metadata, commentParameters);
        }

        private AttributeData BuildNumericAttribute(AttributeMetadata metadata, CommentParameter[] additionalCommentParameters)
        {
            var attribute = BuildAttribute(metadata);
            attribute.Getter.Comment.CommentParameters.AddRange(additionalCommentParameters);
            attribute.FormattedGetter.Comment.CommentParameters.AddRange(additionalCommentParameters);
            return attribute;
        }

        public AttributeData BuildStringAttribute(StringAttributeMetadata metadata)
        {
            var attribute = BuildAttribute(metadata);
            var parameters = new List<CommentParameter>();
            if (metadata.FormatName != null)
            {
                parameters.Add(new CommentParameter("format", metadata.FormatName.Value));
            }
            else if (metadata.Format != null)
            {
                parameters.Add(new CommentParameter("format", Enum.GetName(typeof(StringFormat), metadata.Format)));
            }
            if (metadata.MaxLength != null)
            {
                parameters.Add(new CommentParameter("maxLength", metadata.MaxLength?.ToString()));
            }

            attribute.Getter.Comment.CommentParameters.AddRange(parameters);
            attribute.FormattedGetter.Comment.CommentParameters.AddRange(parameters);
            return attribute;
        }

        private (PropertyData Getter, PropertyData FormattedGetter, PropertyData Setter) GetStandardPropertySet(
            AttributeData attributeData, AttributeMetadata metadata)
        {
            var propertyBuilder = new PropertyBuilder();
            var getter = propertyBuilder.BuildProperty(attributeData);
            var setter = propertyBuilder.BuildProperty(attributeData);
            setter.Generate = attributeData.Generate && setter.Generate && (metadata.IsValidForCreate ?? false) &&
                              (metadata.IsValidForUpdate ?? false);
            var formattedGetter = propertyBuilder.BuildFormattedProperty(attributeData);
            getter.Comment = new Comment(metadata.Description?.UserLocalizedLabel?.Label,
                new CommentParameter("logical", attributeData.LogicalName),
                new CommentParameter("display", attributeData.DisplayName));
            formattedGetter.Comment = new Comment(metadata.Description?.UserLocalizedLabel?.Label,
                new CommentParameter("logical", attributeData.LogicalName),
                new CommentParameter("display", attributeData.DisplayName));
            setter.Comment = new Comment(null);
            return (getter, formattedGetter, setter);
        }

        private (PropertyData Getter, PropertyData FormattedGetter, PropertyData Setter) GetOptionSetPropertySet(
            OptionSetAttributeData attributeData, AttributeMetadata metadata)
        {
            var propertyBuilder = new PropertyBuilder();
            var getter = propertyBuilder.BuildProperty(attributeData);
            var setter = propertyBuilder.BuildProperty(attributeData);
            setter.Generate = attributeData.Generate && setter.Generate && (metadata.IsValidForCreate ?? false) &&
                              (metadata.IsValidForUpdate ?? false);
            var formattedGetter = propertyBuilder.BuildFormattedProperty(attributeData);
            getter.Comment = new Comment(metadata.Description?.UserLocalizedLabel?.Label,
                new CommentParameter("logical", attributeData.LogicalName),
                new CommentParameter("display", attributeData.DisplayName));
            formattedGetter.Comment = new Comment(metadata.Description?.UserLocalizedLabel?.Label,
                new CommentParameter("logical", attributeData.LogicalName),
                new CommentParameter("display", attributeData.DisplayName));
            setter.Comment = new Comment(null);
            return (getter, formattedGetter, setter);
        }
    }
}