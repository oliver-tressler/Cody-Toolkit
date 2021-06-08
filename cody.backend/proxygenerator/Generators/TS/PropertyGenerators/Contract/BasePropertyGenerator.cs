using proxygenerator.Data.Model.Attributes;

namespace proxygenerator.Generators.TS.PropertyGenerators.Contract
{
    public abstract class BasePropertyGenerator<T> where T : AttributeData
    {
        public BasePropertyGenerator(T attributeData)
        {
            Attribute = attributeData;
        }

        protected T Attribute { get; set; }

        public abstract string GenerateAttributeProperties(int indentationLevel);
    }
}