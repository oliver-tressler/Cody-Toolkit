using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Attributes
{
    public class DefaultAttributeGenerator : CodeGenerator
    {
        public DefaultAttributeGenerator(AttributeData attributeData)
        {
            Model = new
            {
                logicalName = attributeData.LogicalName,
                schemaName = attributeData.SchemaName,
                displayName = attributeData.DisplayName,
                type = attributeData.AttributeType
            };
            ShouldGenerate = attributeData.Generate;
        }

        public override object Model { get; }
    }
}
