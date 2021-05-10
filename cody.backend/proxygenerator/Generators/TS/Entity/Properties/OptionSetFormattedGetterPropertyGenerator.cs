using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Properties
{
    public class OptionSetFormattedGetterPropertyGenerator : DefaultFormattedGetterPropertyGenerator
    {
        public OptionSetFormattedGetterPropertyGenerator(OptionSetAttributeData attributeData, EntityData entity) : base(attributeData, entity)
        {
            var enumCodeName = !attributeData.OptionSet.IsExternal
                ? $"{entity.ClassName}.{attributeData.OptionSet.InternalEnumName}"
                : attributeData.OptionSet.InternalEnumName;
            Model = new
            {
                propertyName = attributeData.FormattedGetter.PropertyName,
                typeClass = enumCodeName,
                entityClassName = entity.ClassName,
                logicalName = attributeData.LogicalName,
            };
        }
        
        public override object Model { get; }
    }
}