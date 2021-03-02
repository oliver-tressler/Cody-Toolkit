using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.TS.AttributeGenerators.Concrete;
using proxygenerator.Generators.TS.AttributeGenerators.Contract;

namespace proxygenerator.Generators.TS.AttributeGenerators
{
    public class AttributeGeneratorFactory
    {
        public IAttributeGenerator GetGenerator(AttributeData attribute)
        {
            switch (attribute)
            {
                case DateTimeAttributeData dateTimeAttributeData:
                    return new DateTimeAttributeGenerator(dateTimeAttributeData);
                case LookupAttributeData lookupAttributeData:
                    return new LookupAttributeGenerator(lookupAttributeData);
            }

            return new DefaultAttributeGenerator(attribute);
        }
    }
}