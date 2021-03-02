using System.Text;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.CS.AttributeGenerators.Contract;
using proxygenerator.Utils;

namespace proxygenerator.Generators.CS.AttributeGenerators.Concrete
{
    public class DefaultAttributeGenerator : BaseAttributeGenerator<AttributeData>
    {
        public DefaultAttributeGenerator(AttributeData attribute) : base(attribute)
        {
        }

        public override string GenerateAttribute(int indentationLevel)
        {
            var sb = new StringBuilder();
            sb.AppendLine(new Comment(null, new CommentParameter("para", Attribute.DisplayName), new CommentParameter("para", Attribute.LogicalName)).GenerateXmlSummaryComment(indentationLevel));
            sb.Append($"{TextUtils.Indentation(indentationLevel)}public const string {Attribute.CodeName} = \"{Attribute.LogicalName}\";");
            return sb.ToString();
        }
    }
}