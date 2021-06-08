using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Properties
{
    public class DefaultGetterPropertyGenerator : CodeGenerator
    {
        public DefaultGetterPropertyGenerator(AttributeData attributeData, EntityData entity)
        {
            Model = new
            {
                propertyName = attributeData.Getter.PropertyName,
                typeClass = attributeData.Getter.TypeClass,
                entityClassName = entity.ClassName,
                logicalName = attributeData.LogicalName,
            };
            ShouldGenerate = attributeData.Getter.Generate;
        }
        
        public override object Model { get; }
    }
}