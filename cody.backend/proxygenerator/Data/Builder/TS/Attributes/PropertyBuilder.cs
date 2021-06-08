using System.Text.RegularExpressions;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;

namespace proxygenerator.Data.Builder.TS.Attributes
{
    public class PropertyBuilder
    {
        public PropertyData BuildProperty(AttributeData attribute)
        {
            var property = new PropertyData { Generate = attribute.Generate, PropertyName = attribute.CodeName };
            switch (attribute.AttributeTypeCode)
            {
                case 0: // AttributeTypeCode.Boolean:
                    property.TypeClass = "boolean";
                    break;
                case 1: //AttributeTypeCode.Customer:
                case 6: //AttributeTypeCode.Lookup:
                case 9: //AttributeTypeCode.Owner:
                    property.TypeClass = "EntityReference";
                    break;
                case 10: //AttributeTypeCode.PartyList:
                    property.TypeClass = "EntityReference[]";
                    break;
                case 2: //AttributeTypeCode.DateTime:
                    property.TypeClass = "Date";
                    break;
                case 3: //AttributeTypeCode.Decimal:
                case 4: //AttributeTypeCode.Double:
                case 5: //AttributeTypeCode.Integer:
                case 8: //AttributeTypeCode.Money:
                case 18: //AttributeTypeCode.BigInt:
                    property.TypeClass = "number";
                    break;
                case 7: //AttributeTypeCode.Memo:
                case 14: //AttributeTypeCode.String:
                    property.TypeClass = "string";
                    break;
                case 15: //AttributeTypeCode.Uniqueidentifier:
                    property.TypeClass = "Guid";
                    break;
                // TODO: Identify those
                case 16: //AttributeTypeCode.CalendarRules:
                    property.Generate = false;
                    property.TypeClass = "CalendarRules";
                    break;
                case 17: //AttributeTypeCode.Virtual:
                    property.Generate = false;
                    property.TypeClass = "string";
                    break;
                case 19: //AttributeTypeCode.ManagedProperty:
                    property.Generate = false;
                    property.TypeClass = "ManagedProperty";
                    break;
                case 20: //AttributeTypeCode.EntityName:
                    property.TypeClass = "EntityName";
                    property.Generate = false;
                    break;
                case 11: //AttributeTypeCode.Picklist:
                case 12: //AttributeTypeCode.State:
                case 13: //AttributeTypeCode.Status:
                    property.Generate = false;
                    break;
                default:
                    property.Generate = false;
                    break;
            }

            return property;
        }

        public PropertyData BuildProperty(OptionSetAttributeData attribute)
        {
            return new PropertyData
            {
                Generate = attribute.Generate,
                TypeClass = attribute.OptionSet.InternalEnumName,
                PropertyName = attribute.CodeName
            };
        }

        public PropertyData BuildFormattedProperty(AttributeData attribute)
        {
            return new PropertyData
            {
                Generate = attribute.Generate && attribute.AttributeTypeCode != 7 && attribute.AttributeTypeCode != 14,
                TypeClass = "string",
                PropertyName = Regex.Replace($"{attribute.CodeName}_Formatted", "__+", "_")
            };
        }
    }
}