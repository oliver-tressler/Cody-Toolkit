using System.Collections.Generic;
using Microsoft.Xrm.Sdk;
using proxygenerator.Generators;

namespace proxygenerator.Data.Model
{
    public class ActionData
    {
        public ActionData()
        {
            InputArguments = new List<ActionArgument>();
            OutputArguments = new List<ActionArgument>();
        }
        
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string UniqueName { get; set; }
        public string ClassName { get; set; }
        public string PrimaryEntity { get; set; }
        public string Xaml { get; set; }
        public bool IsTargetAction { get; set; }
        public Comment Comment { get; set; }
        
        public List<ActionArgument> InputArguments { get; set; }
        public List<ActionArgument> OutputArguments { get; set; }
    }

    public class ActionArgument
    {
        public Comment Comment { get; set; }
        public string Name { get; set; }
        public string ArgumentType { get; set; }
        public string EntityType { get; set; }
        public bool Required { get; set; }
        public string Description { get; set; }
        public bool IsTargetArgument { get; set; }


        public string DeduceCodeType()
        {
            switch (ArgumentType)
            {
                case "Int32":
                case "Decimal":
                case "Double":
                case "Money":
                case "OptionSetValue":
                    return "number";
                case "Boolean":
                    return "boolean";
                case "String":
                    return "string";
                case "DateTime":
                    return "Date";
                case "Entity":
                case "EntityReference":
                    return "EntityReference";
                case "EntityCollection":
                    return "EntityReference[]";
            }

            return string.Empty;
        }
        
        public string DeduceProcessDataType()
        {
            return ArgumentType switch
            {
                "Boolean" => "Bool",
                "Int32" => "Int",
                "OptionSetValue" => "OptionSet",
                "Double" => "Float",
                _ => ArgumentType
            };
        }
    }
}