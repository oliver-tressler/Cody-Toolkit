using System.Text;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.CS.PropertyGenerators.Contract;
using proxygenerator.Utils;

namespace proxygenerator.Generators.CS.PropertyGenerators.Concrete
{
    public class OptionSetPropertyGenerator : BasePropertyGenerator<OptionSetAttributeData>
    {
        public OptionSetPropertyGenerator(OptionSetAttributeData attribute) : base(attribute)
        {
        }

        public override string GenerateAttributeProperties(int indentationLevel)
        {
            if (!Attribute.Generate) return string.Empty;
            var i = TextUtils.Indentation(indentationLevel);
            var i1 = TextUtils.Indentation(indentationLevel + 1);
            var i2 = TextUtils.Indentation(indentationLevel + 2);
            var sb = new StringBuilder();
            var enumCodeName = Attribute.OptionSet.InternalEnumName;
            sb.AppendLine(Attribute.Comment.GenerateXmlSummaryComment(indentationLevel));
            sb.AppendLine($"{i}[AttributeLogicalName(\"{Attribute.LogicalName}\")]");
            sb.AppendLine($"{i}public {enumCodeName}? {Attribute.CodeName}");
            sb.AppendLine($"{i}{{");
            if (Attribute.Getter.Generate)
            {
                sb.AppendLine($"{i1}get");
                sb.AppendLine($"{i1}{{");
                sb.AppendLine(
                    $"{i2}if ({Attribute.CodeName}_OptionSetValue != null) {{ return ({enumCodeName}){Attribute.CodeName}_OptionSetValue.Value;}}");
                sb.AppendLine($"{i2}return null;");
                sb.AppendLine($"{i1}}}");
            }
            if (Attribute.Setter.Generate)
            {
                sb.AppendLine($"{i1}set");
                sb.AppendLine($"{i1}{{");
                sb.AppendLine(
                    $"{i2}if (value != null) {{ this.{Attribute.CodeName}_OptionSetValue = new OptionSetValue((int)value);}}");
                sb.AppendLine($"{i2}else this.{Attribute.CodeName}_OptionSetValue = null;");
                sb.AppendLine($"{i1}}}");
            }
            sb.AppendLine($"{i}}}");
            sb.AppendLine();

            sb.AppendLine(Attribute.Comment.GenerateXmlSummaryComment(indentationLevel));
            sb.AppendLine($"{i}[AttributeLogicalName(\"{Attribute.LogicalName}\")]");
            sb.AppendLine($"{i}public OptionSetValue {Attribute.CodeName}_OptionSetValue");
            sb.AppendLine($"{i}{{");
            sb.AppendLine($"{i1}get {{ return this.GetPropertyValue<OptionSetValue>(\"{Attribute.LogicalName}\"); }}");
            sb.AppendLine($"{i1}set {{ this.SetPropertyValue<OptionSetValue>(\"{Attribute.LogicalName}\", value, \"{Attribute.CodeName}_OptionSetValue\"); }}");
            sb.AppendLine($"{i}}}");
            sb.AppendLine($"{i}public string {Attribute.CodeName}_Text(EnumAttributeMetadata AttributeMetadata)");
            sb.AppendLine($"{i}{{");
            sb.AppendLine(
                $"{i1}return AttributeMetadata.GetOptionSetText(this.{Attribute.CodeName}_OptionSetValue.Value);");
            sb.AppendLine($"{i}}}");
            sb.AppendLine(
                new Comment("Retrieves the current value's text in the users language.",
                        new CommentParameter("param name=\"Service\"", "CRM Organization Service"))
                    .GenerateXmlSummaryComment(indentationLevel));
            sb.AppendLine($"{i}public string {Attribute.CodeName}_Text(IOrganizationService Service)");
            sb.AppendLine($"{i}{{");
            sb.AppendLine(
                $"{i1}return this.{Attribute.CodeName}_OptionSetValue.GetOptionSetText(Service, this, \"{Attribute.LogicalName}\");");
            sb.AppendLine($"{i}}}");
            return sb.ToString();
        }
    }
}