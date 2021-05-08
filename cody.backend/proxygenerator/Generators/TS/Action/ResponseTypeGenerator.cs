using System.Collections.Generic;
using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Action
{
    class ActionResponseGenerator : CodeGenerator
    {
        public ActionResponseGenerator(ActionData data)
        {
            Model = new
            {
                isVoid = data.InputArguments.Count(arg => !arg.IsTargetArgument) == 0,
                className = data.ClassName,
            };
            Children = data.OutputArguments.SelectMany(arg => new List<CodeGenerator>
            {
                new CommentGenerator(arg.Comment),
                new ActionMessageArgumentGenerator(arg)
            }).ToList();
        }

        public override object Model { get; }
    }
}