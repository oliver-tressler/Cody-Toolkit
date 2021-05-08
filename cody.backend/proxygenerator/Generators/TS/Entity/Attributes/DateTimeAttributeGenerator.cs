using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Attributes
{
    public class DateTimeAttributeGenerator : CodeGenerator
    {
        public DateTimeAttributeGenerator(DateTimeAttributeData attributeData)
        {
            Model = new
            {
                logicalName = attributeData.LogicalName,
                schemaName = attributeData.SchemaName,
                displayName = attributeData.DisplayName,
                type = attributeData.AttributeType,
                behavior = attributeData.DateTimeTypeName
            };
            ShouldGenerate = attributeData.Generate;
        }

        public override object Model { get; }
    }
}