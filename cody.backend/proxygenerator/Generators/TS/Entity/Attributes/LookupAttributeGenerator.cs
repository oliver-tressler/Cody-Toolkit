using System.Linq;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Attributes
{
    public class LookupAttributeGenerator : CodeGenerator
    {
        public LookupAttributeGenerator(LookupAttributeData attributeData)
        {
            Model = new
            {
                logicalName = attributeData.LogicalName,
                schemaName = attributeData.SchemaName,
                displayName = attributeData.DisplayName,
                type = attributeData.AttributeType,
                odataName = attributeData.ODataRequestName
            };
            Children = attributeData.RelationData.Select(rd => new LookupAttributeRelationshipGenerator(rd)).ToList<CodeGenerator>();
            ShouldGenerate = attributeData.Generate;
            IndentChildren = false;
            ChildrenSeparator = ", ";
        }

        public override object Model { get; }
    }

    public class LookupAttributeRelationshipGenerator : CodeGenerator
    {
        public LookupAttributeRelationshipGenerator(LookupRelationData lookupRelationData)
        {
            Model = lookupRelationData;
        }
        public override object Model { get; }
    }
}