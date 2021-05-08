using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Attributes
{
    public class AttributesGenerator : CodeGenerator
    {
        public AttributesGenerator(EntityData entity)
        {
            Model = new
            {
                entityClassName = entity.ClassName
            };
            Children = entity.Attributes.Select<AttributeData, CodeGenerator>(ad =>
                {
                    return ad switch
                    {
                        DateTimeAttributeData dateTimeAd => new DateTimeAttributeGenerator(dateTimeAd),
                        LookupAttributeData lookupAd => new LookupAttributeGenerator(lookupAd),
                        _ => new DefaultAttributeGenerator(ad)
                    };
                })
                .ToList();
        }

        public override object Model { get; }
    }
}