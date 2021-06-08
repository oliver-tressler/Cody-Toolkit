using System.Linq;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS
{
    public class CommentGenerator : CodeGenerator
    {
        public CommentGenerator(Comment comment)
        {
            ShouldGenerate = comment.Generate && (!string.IsNullOrWhiteSpace(comment.MainDescription) || comment.CommentParameters.Count > 0);
            Model = new
            {
                description = string.IsNullOrWhiteSpace(comment.MainDescription) ? null : Utils.TextUtils.SmartLineBreakInserter(" * ", comment.MainDescription, 120),
                parameters = comment.CommentParameters.Select(param => new
                {
                    name = param.ParameterName,
                    description = param.ParameterText
                })
            };
        }

        public override object Model { get; }
    }
}
