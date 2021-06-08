using System.Text;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.TS.PropertyGenerators.Contract;
using proxygenerator.Utils;

namespace proxygenerator.Generators.TS.PropertyGenerators.Concrete
{
    public class OptionSetPropertyGenerator : BasePropertyGenerator<OptionSetAttributeData>
    {
        private readonly EntityData _entity;

        public OptionSetPropertyGenerator(OptionSetAttributeData attribute, EntityData entity) : base(attribute)
        {
            _entity = entity;
        }

        public override string GenerateAttributeProperties(int indentationLevel)
        {
            if (!Attribute.Generate) return string.Empty;
            var i1 = TextUtils.Indentation(indentationLevel);
            var sb = new StringBuilder();
            var enumCodeName = !Attribute.OptionSet.IsExternal
                ? $"{_entity.ClassName}.{Attribute.OptionSet.InternalEnumName}"
                : Attribute.OptionSet.InternalEnumName;
            if (Attribute.Getter?.Generate == true)
            {
                if (Attribute.Getter.Comment?.Generate == true)
                {
                    sb.AppendLine(Attribute.Getter.Comment.GenerateComment(indentationLevel));
                }
                sb.AppendLine(
                    $"{i1}get {Attribute.Getter.PropertyName}(): {enumCodeName} {{ return this.getAttributeValue<{enumCodeName}>({_entity.ClassName}.Attributes.{Attribute.LogicalName}); }}");
            }
            if (Attribute.FormattedGetter?.Generate == true)
            {
                if (Attribute.FormattedGetter.Comment?.Generate == true)
                {
                    sb.AppendLine(Attribute.FormattedGetter.Comment.GenerateComment(indentationLevel));
                }
                sb.AppendLine(
                    $"{i1}get {Attribute.FormattedGetter.PropertyName}(): string {{ return this.getAttributeValue<string>( {_entity.ClassName}.Attributes.{Attribute.LogicalName}, true); }}");
            }
            if (Attribute.Setter?.Generate == true)
            {
                if (Attribute.Setter.Comment?.Generate == true)
                {
                    sb.AppendLine(Attribute.Setter.Comment.GenerateComment(indentationLevel));
                }
                sb.AppendLine(
                    $"{i1}set {Attribute.Setter.PropertyName}(value: {enumCodeName}) {{ this.setAttributeValue({_entity.ClassName}.Attributes.{Attribute.LogicalName}, value); }}");
            }
            return sb.ToString();
        }
    }
}