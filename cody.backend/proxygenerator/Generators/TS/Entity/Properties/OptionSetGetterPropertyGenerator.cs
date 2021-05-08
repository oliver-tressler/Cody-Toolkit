using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Properties
{
    public class OptionSetGetterPropertyGenerator : DefaultGetterPropertyGenerator
    {
        public OptionSetGetterPropertyGenerator(OptionSetAttributeData attributeData, EntityData entity) : base(attributeData, entity)
        {
            var enumCodeName = !attributeData.OptionSet.IsExternal
                ? $"{entity.ClassName}.{attributeData.OptionSet.InternalEnumName}"
                : attributeData.OptionSet.InternalEnumName;
            Model = new
            {
                propertyName = attributeData.Getter.PropertyName,
                typeClass = enumCodeName,
                entityClassName = entity.ClassName,
                logicalName = attributeData.LogicalName,
            };
        }
        
        public override object Model { get; }
    }
}