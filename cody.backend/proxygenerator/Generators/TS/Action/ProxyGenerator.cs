using System;
using System.Collections.Generic;
using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Action
{
    public class ProxyGenerator : CodeGenerator
    {
        public ProxyGenerator(ActionData action)
        {
            IndentChildren = false;
            ChildrenSeparator = Environment.NewLine;
            Children = new List<CodeGenerator>
            {
                new ImportsGenerator(action),
                new ActionMetadataGenerator(action),
                new ActionRequestGenerator(action),
                new ActionResponseGenerator(action),
                new ActionClassGenerator(action)
            };
        }

        public override object Model { get; }
    }

    public class ActionClassGenerator : CodeGenerator
    {
        public ActionClassGenerator(ActionData action)
        {
            Children = new List<CodeGenerator>
            {
                new CommentGenerator(action.Comment),
                new ActionConstructorGenerator(action)
            };
            var entityTypeInputArguments = action.InputArguments
                .Where(arg => arg.ArgumentType.Contains("Entity") && !arg.IsTargetArgument).ToList();
            if (entityTypeInputArguments.Count > 0)
            {
                Children.Add(new ActionInputParameterPreparationContainerGenerator(action, entityTypeInputArguments));
            }

            Model = new
            {
                targetAction = action.IsTargetAction,
                className = action.ClassName,
                requestClass = action.InputArguments.Count > 0 ? action.ClassName + "Request" : "void",
                responseClass = action.OutputArguments.Count > 0 ? action.ClassName + "Response" : "void",
            };
        }
        
        public override object Model { get; }
    }

    public class ActionInputParameterPreparationContainerGenerator : CodeGenerator
    {
        public ActionInputParameterPreparationContainerGenerator(ActionData action,
            List<ActionArgument> entityTypeInputArguments)
        {
            Model = new
            {
                requestClass = action.InputArguments.Count > 0 ? action.ClassName + "Request" : "void",
            };
            Children = entityTypeInputArguments.Select(inputArg => new ActionInputParameterPreparationGenerator(inputArg)).ToList<CodeGenerator>();
        }

        public override object Model { get; }
    }

    public class ActionInputParameterPreparationGenerator : CodeGenerator
    {
        public ActionInputParameterPreparationGenerator(ActionArgument entityInputArgument)
        {
            Model = new
            {
                argumentName = entityInputArgument.Name,
                entityLogicalName = entityInputArgument.EntityType,
                isCollection = entityInputArgument.ArgumentType == "EntityCollection"
            };
        }
        public override object Model { get; }
    }
}