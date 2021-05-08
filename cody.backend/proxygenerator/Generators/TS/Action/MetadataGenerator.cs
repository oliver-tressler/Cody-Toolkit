using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Action
{
    public class ActionMetadataGenerator : CodeGenerator
    {
        public ActionMetadataGenerator(ActionData action)
        {
            Children = action.InputArguments.Where(arg => !arg.IsTargetArgument)
                .Select(arg => new ActionArgumentMetadataGenerator(arg)).ToList<CodeGenerator>();
        }
        public override object Model { get; }
    }
}