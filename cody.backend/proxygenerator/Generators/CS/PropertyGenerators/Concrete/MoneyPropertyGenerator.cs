using System.Text;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.CS.PropertyGenerators.Contract;
using proxygenerator.Utils;

namespace proxygenerator.Generators.CS.PropertyGenerators.Concrete
{
    class MoneyPropertyGenerator: BasePropertyGenerator<MoneyAttributeData>
    {
        public MoneyPropertyGenerator(MoneyAttributeData attributeData) : base(attributeData)
        {
        }

        public override string GenerateAttributeProperties(int indentationLevel)
        {
            if (!Attribute.Generate) return string.Empty;
            var i = TextUtils.Indentation(indentationLevel);
            var i1 = TextUtils.Indentation(indentationLevel + 1);
            var i2 = TextUtils.Indentation(indentationLevel + 2);
            var sb = new StringBuilder();
            sb.AppendLine(Attribute.Comment.GenerateXmlSummaryComment(indentationLevel));
            sb.AppendLine($"{i}[AttributeLogicalName(\"{Attribute.LogicalName}\")]");
            sb.AppendLine($"{i}public decimal? {Attribute.CodeName}");
            sb.AppendLine($"{i}{{");
            if (Attribute.Getter.Generate)
            {
                sb.AppendLine($"{i1}get");
                sb.AppendLine($"{i1}{{");
                sb.AppendLine($"{i2}if ({Attribute.CodeName}Money != null) {{ return {Attribute.CodeName}Money.Value; }}");
                sb.AppendLine($"{i2}return null;");
                sb.AppendLine($"{i1}}}");
            }
            if (Attribute.Setter.Generate)
            {
                sb.AppendLine($"{i1}set");
                sb.AppendLine($"{i1}{{");
                sb.AppendLine($"{i2}if (value != null) {{ this.{Attribute.CodeName}Money = new Money(value.Value); }}");
                sb.AppendLine($"{i2}else this.{Attribute.CodeName}Money = null;");
                sb.AppendLine($"{i1}}}");
            }
            sb.AppendLine($"{i}}}");
            sb.AppendLine($"{i}[AttributeLogicalName(\"{Attribute.LogicalName}\")]");
            sb.AppendLine($"{i}public {Attribute.Getter.TypeClass} {Attribute.CodeName}Money");
            sb.AppendLine($"{i}{{");
            if (Attribute.Getter.Generate)
            {
                sb.AppendLine(
                    $"{i1}get {{ return this.GetPropertyValue<{Attribute.Getter.TypeClass}>(\"{Attribute.LogicalName}\"); }}");
            }
            if (Attribute.Setter.Generate)
            {
                sb.AppendLine(
                    $"{i1}set {{ this.SetPropertyValue(\"{Attribute.LogicalName}\", ({Attribute.Getter.TypeClass})value, (decimal){Attribute.MinValue}, (decimal){Attribute.MaxValue}, \"{Attribute.CodeName}Money\"); }}");
            }
            sb.AppendLine($"{i}}}");
            return sb.ToString();
        }
    }
}

//get
//{
//if (AdvancePaymentAmountMoney != null) { return AdvancePaymentAmountMoney.Value; }
//return null;
//}
//set
//{
//if (value != null) { this.AdvancePaymentAmountMoney = new Money(value.Value); }
//else this.AdvancePaymentAmountMoney = null;
//}