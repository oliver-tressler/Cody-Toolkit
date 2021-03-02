using System.Text;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.TS.AttributeGenerators.Contract;
using proxygenerator.Utils;

namespace proxygenerator.Generators.TS.AttributeGenerators.Concrete
{
    public class DateTimeAttributeGenerator : BaseAttributeGenerator<DateTimeAttributeData>
    {
        public DateTimeAttributeGenerator(DateTimeAttributeData attribute) : base(attribute)
        {
        }

        public override string GenerateAttribute(int indentationLevel)
        {
            var sb = new StringBuilder(TextUtils.Indentation(indentationLevel));
            sb.Append($"{Attribute.LogicalName}: new DateTimeAttribute("); // Key
            sb.Append($"DateTimeBehaviour.{Attribute.DateTimeTypeName}, ");
            sb.Append($"\"{Attribute.LogicalName}\", "); // Logical Name
            sb.Append($"Attribute.AttributeType.{Attribute.AttributeType}, "); // Type Option Set
            sb.Append($"\"{Attribute.SchemaName}\", "); // Schema Name
            sb.Append($"\"{Attribute.LogicalName}\""); // OData Request Name
            if (!string.IsNullOrWhiteSpace(Attribute.DisplayName)) sb.Append($", \"{Attribute.DisplayName}\"");
            sb.Append(")");
            return
                sb.ToString();
        }
    }
}