using System;

namespace proxygenerator.Generators
{
    [Serializable]
    public class CommentParameter
    {
        public CommentParameter(string parameterName, string parameterText)
        {
            ParameterName = parameterName;
            ParameterText = parameterText;
        }

        public string ParameterName { get; set; }
        public string ParameterText { get; set; }
    }
}