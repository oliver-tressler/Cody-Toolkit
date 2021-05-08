using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity
{
    public class ConstructorGenerator : CodeGenerator
    {
        public ConstructorGenerator(EntityData entity)
        {
            Model = new
            {
                entityClassName = entity.ClassName
            };
        }

        public override object Model { get; }
    }
}