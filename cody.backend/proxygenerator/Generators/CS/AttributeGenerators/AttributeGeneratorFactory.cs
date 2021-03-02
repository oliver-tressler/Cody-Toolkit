using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.CS.AttributeGenerators.Concrete;
using proxygenerator.Generators.CS.AttributeGenerators.Contract;

namespace proxygenerator.Generators.CS.AttributeGenerators
{
    public class AttributeGeneratorFactory
    {
        public IAttributeGenerator GetGenerator(AttributeData attribute)
        {
            return new DefaultAttributeGenerator(attribute);
        }
    }
}