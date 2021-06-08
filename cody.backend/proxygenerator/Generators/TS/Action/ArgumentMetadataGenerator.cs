using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Action
{
    class ActionArgumentMetadataGenerator: CodeGenerator
    {
        public ActionArgumentMetadataGenerator(ActionArgument argument)
        {
            Model = new
            {
                name = argument.Name,
                dataType = argument.DeduceProcessDataType()
            };
        }
        public override object Model { get; }
    }
}