using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Properties
{
    public class DefaultFormattedGetterPropertyGenerator : CodeGenerator
    {
        public DefaultFormattedGetterPropertyGenerator(AttributeData attributeData, EntityData entity)
        {
            Model = new
            {
                propertyName = attributeData.FormattedGetter.PropertyName,
                entityClassName = entity.ClassName,
                logicalName = attributeData.LogicalName
            };
            ShouldGenerate = attributeData.FormattedGetter.Generate;
        }
        
        public override object Model { get; }
    }
}