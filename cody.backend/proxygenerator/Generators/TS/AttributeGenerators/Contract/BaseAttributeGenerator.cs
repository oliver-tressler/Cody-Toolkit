using System;
using System.Linq;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model.Attributes;

namespace proxygenerator.Generators.TS.AttributeGenerators.Contract
{
    public abstract class BaseAttributeGenerator<T> : IAttributeGenerator where T : AttributeData
    {
        protected BaseAttributeGenerator(T attribute)
        {
            Attribute = attribute;
        }

        protected T Attribute { get; }

        public abstract string GenerateAttribute(int indentationLevel);

        public string GetAttributeTypeOptionSetString(AttributeTypeCode? attributeTypeCode)
        {
            return
                $"Attribute.AttributeType.{Enum.GetName(typeof(AttributeTypeCode), attributeTypeCode ?? throw new ArgumentOutOfRangeException(nameof(attributeTypeCode)))}";
        }

        public string GetFromTemplate(string logicalName, string attributeClass,
            params (string ParameterValue, bool InQuotes)[] parameters)
        {
            var processedParameters = parameters.Select(parameter =>
            {
                if (!string.IsNullOrEmpty(parameter.ParameterValue))
                    return parameter.InQuotes ? $"\"{parameter.ParameterValue}\"" : parameter.ParameterValue;

                return parameter.InQuotes ? "\"\"" : null;
            });
            return $"{logicalName}: new {attributeClass}({string.Join(", ", processedParameters)})";
        }
    }
}