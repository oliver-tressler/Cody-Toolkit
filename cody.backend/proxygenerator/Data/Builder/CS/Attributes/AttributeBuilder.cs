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

namespace proxygenerator.Data.Builder.CS.Attributes
{
    public class AttributeBuilder : IAttributeBuilder
    {
        private T BuildBaseAttribute<T>(AttributeMetadata metadata, T attributeData) where T : AttributeData
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
            if (metadata.AttributeType == AttributeTypeCode.Uniqueidentifier) attributeData.CodeName += "Id"; 
            attributeData.ODataRequestName = metadata.LogicalName;
            attributeData.Generate = string.IsNullOrWhiteSpace(metadata.AttributeOf) ||
                                     (metadata.IsPrimaryId ?? false) || (metadata.IsPrimaryName ?? false);
            attributeData.Comment = new Comment(metadata.GetDescription(),
                new CommentParameter("para", $"Logical Name: {metadata.LogicalName}"),
                new CommentParameter("para", $"Display Name: {attributeData.DisplayName}"));
            return attributeData;
        }

        public AttributeData BuildAttribute(AttributeMetadata metadata)
        {
            AttributeData attributeData = BuildBaseAttribute(metadata, new AttributeData());
            (attributeData.Getter, attributeData.FormattedGetter, attributeData.Setter) =
                GetStandardPropertySet(attributeData, metadata);
            return attributeData;
        }

        public DateTimeAttributeData BuildDateTimeAttribute(DateTimeAttributeMetadata metadata)
        {
            var attributeData = BuildBaseAttribute(metadata, new DateTimeAttributeData());
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
            attributeData.Comment.CommentParameters.Add(new CommentParameter("para",
                $"Behavior: {attributeData.DateTimeTypeName}"));
            return attributeData;
        }

        public LookupAttributeData BuildLookupAttribute(LookupAttributeMetadata metadata,
            IEnumerable<(OneToManyRelationshipMetadata relationship, RelatedEntityData relatedEntity)> relationships)
        {
            var attributeData = BuildBaseAttribute(metadata, new LookupAttributeData());
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
            attributeData.Comment.CommentParameters.Add(new CommentParameter("para",
                (attributeData.RelationData.Length > 1 ? "Entities:" : "Entity:") + string.Join(", ", attributeData.RelationData.Select(data => data.ReferencedEntityLogicalName).Distinct())));
            return attributeData;
        }

        public AttributeData BuildPartyListAttribute(LookupAttributeMetadata partyLookupAttributeMetadata, IEnumerable<RelatedEntityData> targetEntities)
        {
            var attributeData = BuildBaseAttribute(partyLookupAttributeMetadata, new LookupAttributeData());
            attributeData.RelationData = targetEntities.Select(entity => new LookupRelationData
            {
                ReferencedEntityDisplayName = entity.DisplayName,
                ReferencedEntityLogicalName = entity.LogicalName,
                ReferencedEntitySetName = entity.EntitySetName
            }).ToArray();
            (attributeData.Getter, attributeData.FormattedGetter, attributeData.Setter) =
                GetStandardPropertySet(attributeData, partyLookupAttributeMetadata);
            attributeData.Comment.CommentParameters.Add(new CommentParameter("para",
                (attributeData.RelationData.Length > 1 ? "Entities:" : "Entity:") + string.Join(", ", attributeData.RelationData.Select(data => data.ReferencedEntityLogicalName).Distinct())));
            return attributeData;
        }

        public OptionSetAttributeData BuildOptionSetAttribute(EnumAttributeMetadata metadata, OptionSetData optionSet)
        {
            var attributeData = BuildBaseAttribute(metadata, new OptionSetAttributeData());
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
                    paramTexts.Add("(default)");
                }
                var commentParameter = new CommentParameter("para", "True = " + string.Join(" - ", paramTexts));
                attributeData.Comment.CommentParameters.Add(commentParameter);
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
                    paramTexts.Add("(default)");
                }
                var commentParameter = new CommentParameter("para", "False = " + string.Join(" - ", paramTexts));
                attributeData.Comment.CommentParameters.Add(commentParameter);
            }

            return attributeData;
        }

        public AttributeData BuildStringAttribute(StringAttributeMetadata metadata)
        {
            var attribute = BuildBaseAttribute(metadata, new StringAttributeData());
            var parameters = new List<CommentParameter>();
            if (metadata.FormatName != null)
            {
                parameters.Add(new CommentParameter("para", "Format: " + metadata.FormatName.Value));
            }
            else if (metadata.Format != null)
            {
                parameters.Add(new CommentParameter("para", "Format: " + Enum.GetName(typeof(StringFormat), metadata.Format)));
            }
            if (metadata.MaxLength != null)
            {
                parameters.Add(new CommentParameter("para", "Maximum Length: " + metadata.MaxLength));
            }

            attribute.MaxLength = metadata.MaxLength ?? 0;
            (attribute.Getter, attribute.FormattedGetter, attribute.Setter) =
                GetStringPropertySet(attribute, metadata);
            attribute.Comment.CommentParameters.AddRange(parameters);
            return attribute;
        }

        public AttributeData BuildNumericAttribute(BigIntAttributeMetadata metadata)
        {
            var commentParameters = new[]
            {
                new CommentParameter("para", "Minimum Value: "+ (metadata.MinValue ?? long.MinValue)),
                new CommentParameter("para", "Maximum Value: "+(metadata.MaxValue ?? long.MaxValue)),
            };
            var attr = BuildBaseAttribute(metadata, new NumericAttributeData());
            attr.MinValue = (metadata.MinValue ?? long.MinValue).ToString();
            attr.MaxValue = (metadata.MaxValue ?? long.MaxValue).ToString();
            (attr.Getter, attr.FormattedGetter, attr.Setter) = GetNumericPropertySet(attr, metadata);
            attr.Comment.CommentParameters.AddRange(commentParameters);
            return attr;
        }

        public AttributeData BuildNumericAttribute(IntegerAttributeMetadata metadata)
        {
            var commentParameters = new List<CommentParameter>
            {
                new CommentParameter("para", "Minimum Value: "+ (metadata.MinValue ?? int.MinValue)),
                new CommentParameter("para", "Maximum Value: "+(metadata.MaxValue ?? int.MaxValue)),
            };
            if (metadata.Format != null && metadata.Format != IntegerFormat.None)
            {
                commentParameters.Add(new CommentParameter("para", "Format: " + Enum.GetName(typeof(IntegerFormat), metadata.Format)));
            }
            var attr = BuildBaseAttribute(metadata, new NumericAttributeData());
            attr.MinValue = (metadata.MinValue ?? int.MinValue).ToString(CultureInfo.CurrentCulture);
            attr.MaxValue = (metadata.MaxValue ?? int.MaxValue).ToString(CultureInfo.CurrentCulture);
            (attr.Getter, attr.FormattedGetter, attr.Setter) = GetNumericPropertySet(attr, metadata);
            attr.Comment.CommentParameters.AddRange(commentParameters);
            return attr;
        }

        public AttributeData BuildNumericAttribute(DecimalAttributeMetadata metadata)
        {
            var commentParameters = new[]
            {
                new CommentParameter("para", "Minimum Value: "+ (metadata.MinValue ?? decimal.MinValue)),
                new CommentParameter("para", "Maximum Value: "+(metadata.MaxValue ?? decimal.MaxValue)),
                new CommentParameter("para", "Precision: "+ (metadata.Precision ?? 2)),
            };
            var attr = BuildBaseAttribute(metadata, new PrecisionNumericAttributeData());
            attr.MinValue = (metadata.MinValue ?? decimal.MinValue).ToString(CultureInfo.CurrentCulture);
            attr.MaxValue = (metadata.MaxValue ?? decimal.MaxValue).ToString(CultureInfo.CurrentCulture);
            attr.Precision = metadata.Precision ?? 2;
            (attr.Getter, attr.FormattedGetter, attr.Setter) = GetPrecisionNumericPropertySet(attr, metadata);
            attr.Comment.CommentParameters.AddRange(commentParameters);
            return attr;
        }

        public AttributeData BuildNumericAttribute(DoubleAttributeMetadata metadata)
        {
            var commentParameters = new[]
            {
                new CommentParameter("para", "Minimum Value: "+ (metadata.MinValue ?? double.MinValue)),
                new CommentParameter("para", "Maximum Value: "+(metadata.MaxValue ?? double.MaxValue)),
                new CommentParameter("para", "Precision: "+ (metadata.Precision ?? 2)),
            };
            var attr = BuildBaseAttribute(metadata, new PrecisionNumericAttributeData());
            attr.MinValue = (metadata.MinValue ?? double.MinValue).ToString(CultureInfo.CurrentCulture);
            attr.MaxValue = (metadata.MaxValue ?? double.MaxValue).ToString(CultureInfo.CurrentCulture);
            attr.Precision = metadata.Precision ?? 2;
            (attr.Getter, attr.FormattedGetter, attr.Setter) = GetPrecisionNumericPropertySet(attr, metadata);
            attr.Comment.CommentParameters.AddRange(commentParameters);
            return attr;
        }

        public AttributeData BuildNumericAttribute(MoneyAttributeMetadata metadata)
        {
            var commentParameters = new[]
            {
                new CommentParameter("para", "Minimum Value: "+ (metadata.MinValue ?? double.MinValue)),
                new CommentParameter("para", "Maximum Value: "+(metadata.MaxValue ?? double.MaxValue)),
                new CommentParameter("para", "Precision: "+ (metadata.Precision ?? 2)),
            };
            var attr = BuildBaseAttribute(metadata, new MoneyAttributeData());
            attr.MinValue = (metadata.MinValue ?? double.MinValue).ToString(CultureInfo.CurrentCulture);
            attr.MaxValue = (metadata.MaxValue ?? double.MaxValue).ToString(CultureInfo.CurrentCulture);
            attr.Precision = metadata.Precision ?? 2;
            (attr.Getter, attr.FormattedGetter, attr.Setter) = GetPrecisionNumericPropertySet(attr, metadata);
            attr.Comment.CommentParameters.AddRange(commentParameters);
            return attr;
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
            return (getter, formattedGetter, setter);
        }

        private (StringPropertyData Getter, PropertyData FormattedGetter, StringPropertyData Setter) GetStringPropertySet(
            StringAttributeData attributeData, StringAttributeMetadata metadata)
        {
            var propertyBuilder = new PropertyBuilder();
            var getter = propertyBuilder.BuildProperty(attributeData);
            var setter = propertyBuilder.BuildProperty(attributeData);
            setter.Generate = attributeData.Generate && setter.Generate && (metadata.IsValidForCreate ?? false) &&
                              (metadata.IsValidForUpdate ?? false);
            var formattedGetter = propertyBuilder.BuildFormattedProperty(attributeData);
            setter.Comment = new Comment(null);
            return (getter, formattedGetter, setter);
        }

        private (NumericPropertyData Getter, PropertyData FormattedGetter, NumericPropertyData Setter) GetNumericPropertySet(
            NumericAttributeData attributeData, AttributeMetadata metadata)
        {
            var propertyBuilder = new PropertyBuilder();
            var getter = propertyBuilder.BuildProperty(attributeData);
            var setter = propertyBuilder.BuildProperty(attributeData);
            setter.Generate = attributeData.Generate && setter.Generate && (metadata.IsValidForCreate ?? false) &&
                              (metadata.IsValidForUpdate ?? false);
            var formattedGetter = propertyBuilder.BuildFormattedProperty(attributeData);
            return (getter, formattedGetter, setter);
        }
        private (PrecisionNumericPropertyData Getter, PropertyData FormattedGetter, PrecisionNumericPropertyData Setter) GetPrecisionNumericPropertySet(
            PrecisionNumericAttributeData attributeData, AttributeMetadata metadata)
        {
            var propertyBuilder = new PropertyBuilder();
            var getter = propertyBuilder.BuildProperty(attributeData);
            var setter = propertyBuilder.BuildProperty(attributeData);
            setter.Generate = attributeData.Generate && setter.Generate && (metadata.IsValidForCreate ?? false) &&
                              (metadata.IsValidForUpdate ?? false);
            var formattedGetter = propertyBuilder.BuildFormattedProperty(attributeData);
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
            return (getter, formattedGetter, setter);
        }
    }
}