using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Action
{
    public class ActionMessageArgumentGenerator : CodeGenerator
    {
        public ActionMessageArgumentGenerator(ActionArgument argument)
        {
            Model = new
            {
                argumentName = argument.Name,
                optional = !argument.Required,
                codeType = argument.DeduceCodeType()
            };
        }

        public override object Model { get; }
    }
}