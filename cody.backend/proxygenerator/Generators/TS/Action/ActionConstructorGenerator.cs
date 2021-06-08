using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;
using proxygenerator.Utils;

namespace proxygenerator.Generators.TS.Action
{
    public class ActionConstructorGenerator : CodeGenerator
    {
        public ActionConstructorGenerator(ActionData action)
        {
            Model = new
            {
                targetAction = action.IsTargetAction,
                name = action.Name,
                primaryEntity = action.PrimaryEntity
            };
        }

        public override object Model { get; }
    }
}