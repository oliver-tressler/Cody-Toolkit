using System.Text;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.TS.AttributeGenerators.Contract;
using proxygenerator.Utils;

namespace proxygenerator.Generators.TS.AttributeGenerators.Concrete
{
    public class LookupAttributeGenerator : BaseAttributeGenerator<LookupAttributeData>
    {
        public LookupAttributeGenerator(LookupAttributeData attribute) : base(attribute)
        {
        }

        public override string GenerateAttribute(int indentationLevel)
        {
            var sb = new StringBuilder(TextUtils.Indentation(indentationLevel));
            sb.Append($"{Attribute.LogicalName}: new LookupAttribute("); // Key
            sb.Append("[");
            foreach (var lookupRelationData in Attribute.RelationData)
            {
                sb.Append("{");
                //sb.Append($"relationShipName: \"{lookupRelationData.RelationShipSchemaName}\", ");
                sb.Append($"referencedEntityLogicalName: \"{lookupRelationData.ReferencedEntityLogicalName}\", ");
                sb.Append($"referencedEntitySetName: \"{lookupRelationData.ReferencedEntitySetName}\", ");
                sb.Append($"referencedAttributeLogicalName: \"{lookupRelationData.ReferencedAttributeLogicalName}\", ");
                sb.Append($"referencedAttributeDisplayName: \"{lookupRelationData.ReferencedAttributeDisplayName}\", ");
                sb.Append("},");
            }
            sb.Append("],");
            sb.Append($"\"{Attribute.LogicalName}\", "); // Logical Name
            sb.Append($"Attribute.AttributeType.{Attribute.AttributeType}, "); // Type Option Set
            sb.Append($"\"{Attribute.SchemaName}\", "); // Schema Name
            sb.Append($"\"_{Attribute.LogicalName}_value\""); // OData Request Name
            if (!string.IsNullOrWhiteSpace(Attribute.DisplayName)) sb.Append($", \"{Attribute.DisplayName}\"");
            sb.Append(")");
            return
                sb.ToString();
        }
    }
}