using System.Text;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.CS.PropertyGenerators.Contract;
using proxygenerator.Utils;

namespace proxygenerator.Generators.CS.PropertyGenerators.Concrete
{
    class DoublePropertyGenerator: BasePropertyGenerator<PrecisionNumericAttributeData>
    {
        public DoublePropertyGenerator(PrecisionNumericAttributeData attributeData) : base(attributeData)
        {
        }

        public override string GenerateAttributeProperties(int indentationLevel)
        {
            if (!Attribute.Generate) return string.Empty;
            var i = TextUtils.Indentation(indentationLevel);
            var i1 = TextUtils.Indentation(indentationLevel + 1);
            var sb = new StringBuilder();
            sb.AppendLine(Attribute.Comment.GenerateXmlSummaryComment(indentationLevel));
            sb.AppendLine($"{i}[AttributeLogicalName(\"{Attribute.LogicalName}\")]");
            sb.AppendLine($"{i}public {Attribute.Getter.TypeClass} {Attribute.CodeName}");
            sb.AppendLine($"{i}{{");
            if (Attribute.Getter.Generate)
            {
                sb.AppendLine(
                    $"{i1}get {{ return this.GetPropertyValue<{Attribute.Getter.TypeClass}>(\"{Attribute.LogicalName}\"); }}");
            }
            if (Attribute.Setter.Generate)
            {
                sb.AppendLine(
                    $"{i1}set {{ this.SetPropertyValue(\"{Attribute.LogicalName}\", (double?)value, (double){Attribute.MinValue}, (double){Attribute.MaxValue}, \"{Attribute.CodeName}\"); }}");
            }
            sb.AppendLine($"{i}}}");
            return sb.ToString();
        }
    }
}