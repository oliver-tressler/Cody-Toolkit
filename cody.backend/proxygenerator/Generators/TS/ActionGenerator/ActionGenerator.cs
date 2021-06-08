using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;
using proxygenerator.Utils;

namespace proxygenerator.Generators.TS.ActionGenerator
{
    public class ActionGenerator : IActionGenerator
    {
        private readonly ActionData _data;

        private readonly List<(string[] Classes, string From)> _imports;

        private void GenerateImports(StringBuilder code)
        {
            code.AppendLine("// #region Imports");
            foreach (var (classes, file) in _imports)
                code.AppendLine(
                    $"import {{ {string.Join(", ", classes)} }} from \"{file}\";");
            code.AppendLine("// #endregion");
        }

        private readonly string _actionClassName;
        private readonly bool _isTargetAction;


        public ActionGenerator(ActionData data)
        {
            _data = data;
            _actionClassName = string.Join(string.Empty,
                Regex.Split(_data.DisplayName ?? _data.Name, "\\W+").Where(s =>!string.IsNullOrWhiteSpace(s))
                .Select(s => Scriban.Functions.StringFunctions.Capitalize(Regex.Replace(s, "\\W", ""))));
            _isTargetAction = !string.IsNullOrWhiteSpace(_data.PrimaryEntity);
            _imports = new List<(string[] Classes, string From)>
            {
                (new[] {$"Base{(_isTargetAction ? "Target" : string.Empty)}ActionProxy"},
                    "Proxies/core/BaseActionProxy"),
                (new[] {"EntityReference"},
                    "Proxies/core/entityReference"),
                (new[] {"InputParameter", "ProcessDataType"},
                    "WebApi/Process"),
            };
        }

        public string GenerateActionCode()
        {
            var code = new StringBuilder();
            GenerateImports(code);
            code.AppendLine();
            GenerateArgumentMetadata(code);
            code.AppendLine();
            GenerateRequestType(code);
            code.AppendLine();
            GenerateResponseType(code);
            code.AppendLine();
            GenerateActionClass(code);
            return code.ToString();
        }

        private void GenerateRequestType(StringBuilder code)
        {
            if (_data.InputArguments.Count(arg => !arg.IsTargetArgument) == 0)
            {
                code.AppendLine($"type {_actionClassName}Request = void;");
                return;
            }

            code.AppendLine($"export type {_actionClassName}Request = {{");
            foreach (var argument in _data.InputArguments.Where(arg => arg.IsTargetArgument == false))
            {
                if (!string.IsNullOrWhiteSpace(argument.Description) || !string.IsNullOrWhiteSpace(argument.EntityType))
                {
                    var comment = new Comment(argument.Description);
                    if (!string.IsNullOrWhiteSpace(argument.EntityType))
                    {
                        comment.CommentParameters.Add(new CommentParameter("logicalName", argument.EntityType));
                    }
                    code.AppendLine(comment.GenerateComment(1));
                }
                code.AppendLine(TextUtils.Indentation(1) + GenerateArgumentType(argument));
            }

            code.AppendLine("}");
        }

        private void GenerateResponseType(StringBuilder code)
        {
            if (_data.OutputArguments.Count == 0)
            {
                code.AppendLine($"type {_actionClassName}Response = void;");
                return;
            }

            code.AppendLine($"export type {_actionClassName}Response = {{");
            foreach (var argument in _data.OutputArguments)
            {
                if (!string.IsNullOrWhiteSpace(argument.Description) || !string.IsNullOrWhiteSpace(argument.EntityType))
                {
                    var comment = new Comment(argument.Description);
                    if (!string.IsNullOrWhiteSpace(argument.EntityType))
                    {
                        comment.CommentParameters.Add(new CommentParameter("logicalName", argument.EntityType));
                    }
                    code.AppendLine(comment.GenerateComment(1));
                }
                code.AppendLine(TextUtils.Indentation(1) + GenerateArgumentType(argument));
            }

            code.AppendLine("}");
        }

        private string GenerateArgumentType(ActionArgument argument)
        {
            return $"{argument.Name}{(argument.Required ? string.Empty : "?")}: {argument.DeduceCodeType()};";
        }

        private void GenerateActionClass(StringBuilder code)
        {
            var requestClassType = _data.InputArguments.Count > 0 ? _actionClassName + "Request" : "void";
            var responseClassType = _data.InputArguments.Count > 0 ? _actionClassName + "Response" : "void";
            code.AppendLine(
                $"export class {_actionClassName}Action extends Base{(_isTargetAction ? "Target" : string.Empty)}ActionProxy<{requestClassType}, {responseClassType}> {{");
            if (_isTargetAction)
            {
                code.AppendLine(new Comment(null, new CommentParameter("param", "target: "+_data.PrimaryEntity)).GenerateComment(1));
            }
            code.AppendLine(
                $"{TextUtils.Indentation(1)}constructor({(_isTargetAction ? "target: EntityReference" : string.Empty)}) {{");
            code.AppendLine(TextUtils.Indentation(2) +
                            $"super({(_isTargetAction ? "{ actionName: \"" + _data.Name + "\", argumentMetadata, logicalName: \"" + _data.PrimaryEntity + "\"}, target" : "{ actionName: \"" + _data.Name + "\", argumentMetadata }")})");
            code.AppendLine(TextUtils.Indentation(1) + "}");
            var entityTypeInputArguments = _data.InputArguments
                .Where(arg => arg.ArgumentType.Contains("Entity") && !arg.IsTargetArgument).ToList();
            if (entityTypeInputArguments.Count > 0)
            {
                code.AppendLine();
                code.AppendLine(
                    $"{TextUtils.Indentation(1)}protected prepareRequestParameters(inputArguments: {_actionClassName}Request) {{");
                code.AppendLine($"{TextUtils.Indentation(2)}return [");
                code.AppendLine($"{TextUtils.Indentation(3)}...super.prepareRequestParameters(inputArguments),");
                foreach (var entityTypeInputArgument in entityTypeInputArguments)
                {
                    code.AppendLine(
                        string.Format("{0}...this.prepareEntity{1}RequestParameter(\"{2}\", inputArguments.{3}{4}),",
                            TextUtils.Indentation(3),
                            entityTypeInputArgument.ArgumentType.Contains("Collection") ? "Collection" : string.Empty,
                            entityTypeInputArgument.Name, entityTypeInputArgument.Name,
                            string.IsNullOrWhiteSpace(entityTypeInputArgument.EntityType)
                                ? string.Empty
                                : $", \"{entityTypeInputArgument.EntityType}\""));
                }

                code.AppendLine($"{TextUtils.Indentation(2)}] as InputParameter[];");
                code.AppendLine(TextUtils.Indentation(1) + "}");
            }

            code.AppendLine("}");
        }

        private void GenerateArgumentMetadata(StringBuilder code)
        {
            var args = _data.InputArguments.Where(argument => !argument.IsTargetArgument);
            code.AppendLine("const argumentMetadata = {");
            foreach (var arg in args)
            {
                code.AppendLine($"{TextUtils.Indentation(1)}\"{arg.Name}\": ProcessDataType.{arg.DeduceProcessDataType()},");
            }
            code.AppendLine("}");
        }
    }
}