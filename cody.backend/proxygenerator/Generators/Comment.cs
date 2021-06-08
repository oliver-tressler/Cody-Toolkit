using System;
using System.Collections.Generic;
using System.Text;
using proxygenerator.Utils;

namespace proxygenerator.Generators
{
    [Serializable]
    public class Comment
    {
        private const int MaxCommentLength = 120;
        public Comment(string description, params CommentParameter[] parameters)
        {
            MainDescription = description;
            CommentParameters = new List<CommentParameter>(parameters);
        }

        public string MainDescription { get; set; }
        public List<CommentParameter> CommentParameters { get; }
        public bool Generate => !string.IsNullOrWhiteSpace(MainDescription) || CommentParameters.Count > 0;
        public string GenerateComment(int indentationLevel)
        {
            var sb = new StringBuilder();
            var indentation = TextUtils.Indentation(indentationLevel);
            var prefix = $"{indentation} * ";
            sb.AppendLine(indentation + "/**");
            if (!string.IsNullOrEmpty(MainDescription))
            {
                sb.Append(TextUtils.SmartLineBreakInserter(prefix, MainDescription, MaxCommentLength));
            }
            if (CommentParameters.Count > 0)
            {
                if (!string.IsNullOrWhiteSpace(MainDescription)) sb.AppendLine(prefix);
                foreach (var commentParameter in CommentParameters)
                    sb.AppendLine($"{prefix}@{commentParameter.ParameterName} {commentParameter.ParameterText}");
            }
            sb.Append(indentation + " */");
            return sb.ToString();
        }
        
        public string GenerateXmlSummaryComment(int indentationLevel)
        {
            var sb = new StringBuilder();
            var indentation = TextUtils.Indentation(indentationLevel);
            var prefix = $"{indentation}/// ";
            sb.AppendLine($"{prefix}<summary>");
            if (!string.IsNullOrEmpty(MainDescription))
            {
                sb.Append(TextUtils.SmartLineBreakInserter(prefix, MainDescription, MaxCommentLength));
            }
            if (CommentParameters.Count > 0)
            {
                foreach (var commentParameter in CommentParameters)
                    sb.AppendLine($"{prefix}<{commentParameter.ParameterName}>{commentParameter.ParameterText}</{commentParameter.ParameterName}>");
            }
            sb.Append($"{prefix}</summary>");
            return sb.ToString();
        }
    }
}