using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Xaml;
using System.Xml;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model;
using proxygenerator.Generators;

namespace proxygenerator.Data.Builder.TS
{
    public class ActionBuilder
    {
        public ActionData ConstructAction(Entity entity)
        {
            var actionData = ReadBaseActionDataFromEntity(entity);
            if (!TryParseXamlToArgumentLists(
                actionData.Xaml,
                out var inputArguments,
                out var outputArguments)
            )
            {
                throw new Exception("Unable to parse action arguments");
            }

            
            actionData.IsTargetAction = inputArguments.Any(arg => arg.IsTargetArgument);
            actionData.InputArguments = inputArguments;
            actionData.OutputArguments = outputArguments;
            actionData.Comment = new Comment(string.Empty);
            if (actionData.IsTargetAction)
            {
                actionData.Comment.CommentParameters.Add(new CommentParameter("param",
                    "target: " + actionData.PrimaryEntity));
            }
            return actionData;
        }

        private ActionData ReadBaseActionDataFromEntity(Entity action)
        {
            var name = action["message.name"] is AliasedValue alias ? alias.Value as string : null;
            var displayName = action["name"] as string;
            var uniqueName = action["uniquename"] as string;
            var className = string.Join(string.Empty,
                Regex.Split(displayName ?? name ?? uniqueName ?? string.Empty, "\\W+").Where(s =>!string.IsNullOrWhiteSpace(s))
                    .Select(s => Scriban.Functions.StringFunctions.Capitalize(Regex.Replace(s, "\\W", ""))));
            
            var xaml = action["xaml"] as string;
            var primaryEntityLogicalName = action["primaryentity"] is string entity && entity != "none" ? entity : null;
            var comment = new Comment(string.Empty);
            
            return new ActionData()
            {
                Name = name,
                DisplayName = displayName,
                UniqueName = uniqueName,
                ClassName = className,
                PrimaryEntity = primaryEntityLogicalName,
                Xaml = xaml,
            };
        }

        private bool TryParseXamlToArgumentLists(string xaml, out List<ActionArgument> inputArguments,
            out List<ActionArgument> outputArguments)
        {
            inputArguments = new List<ActionArgument>();
            outputArguments = new List<ActionArgument>();
            try
            {
                // Use XML Document as other parsers complain about the XAML stuff
                var doc = new XmlDocument();
                doc.LoadXml(xaml);
                var properties = doc.GetElementsByTagName("x:Members")[0].ChildNodes;
                for (var i = 0; i < properties.Count; i++)
                {
                    var property = properties.Item(i);
                    if (property == null) continue;
                    var propertyName = property.Attributes?["Name"].Value;
                    var propertyType = property.Attributes?["Type"].Value;
                    if (propertyName == null || propertyType == null || propertyName == "InputEntities" ||
                        propertyName == "CreatedEntities" ||
                        propertyType == "InArgument(scg:IDictionary(x:String, mxs:Entity))")
                    {
                        continue;
                    }

                    var propertyTypeRegex = new Regex("^(?'Direction'InArgument|OutArgument)\\(\\w+:(?'Type'\\w+)\\)");
                    var propertyTypeRegexResult = propertyTypeRegex.Match(propertyType);
                    var directionGrp = propertyTypeRegexResult.Groups["Direction"];
                    var typeGrp = propertyTypeRegexResult.Groups["Type"];
                    var direction = directionGrp.Success ? directionGrp.Captures[0].Value : null;
                    var type = typeGrp.Success ? typeGrp.Captures[0].Value : null;
                    string entityType = null;
                    var propertyAttributesNode = property.FirstChild;
                    if (type == "Entity" || type == "EntityReference")
                    {
                        entityType = propertyAttributesNode.ChildNodes[4]?.Attributes?["Value"].Value;
                    }

                    var required =
                        propertyAttributesNode.ChildNodes[0]?.Attributes?["Value"].Value == "True";
                    var target = propertyAttributesNode.ChildNodes[1]?.Attributes?["Value"].Value == "True";
                    var description = propertyAttributesNode.ChildNodes[2]?.Attributes?["Value"].Value;
                    var argument = new ActionArgument()
                    {
                        Name = propertyName,
                        ArgumentType = type,
                        EntityType = entityType,
                        Required = required,
                        Description = description != null && description != "New Argument" ? description : null,
                        IsTargetArgument = target,
                        Comment = new Comment(description?.Replace("New Argument", ""))
                    };
                    if (!string.IsNullOrWhiteSpace(entityType))
                    {
                        argument.Comment.CommentParameters.Add(new CommentParameter("logicalName", entityType));
                    }
                    switch (direction)
                    {
                        case "InArgument":
                            inputArguments.Add(argument);
                            break;
                        case "OutArgument":
                            outputArguments.Add(argument);
                            break;
                    }
                }

                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}