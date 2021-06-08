using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model.OptionSets;
using proxygenerator.Generators;
using static Scriban.Functions.StringFunctions;

namespace proxygenerator.Data.Builder.TS.OptionSets
{
    public class OptionBuilder
    {
        private OptionData BuildBaseOption(OptionMetadata metadata)
        {
            var option = new OptionData();
            option.Comment = new Comment(
                string.Join(Environment.NewLine, new List<string>
                {
                    metadata.Label?.UserLocalizedLabel?.Label,
                    metadata.Description?.UserLocalizedLabel?.Label
                }.Where(s => !string.IsNullOrWhiteSpace(s))),
                new CommentParameter("value", metadata.Value?.ToString() ?? "No value"));
            option.OptionLabel = metadata.Label?.UserLocalizedLabel?.Label;
            option.OptionValue = metadata.Value;
            var tempOptionName = metadata.Label?.UserLocalizedLabel?.Label;
            if (string.IsNullOrWhiteSpace(tempOptionName))
            {
                tempOptionName = "Option_" + metadata.Value;
            }
            else
            {
                if (Regex.Match(tempOptionName, "^\\d").Success) tempOptionName = "_" + tempOptionName;

                tempOptionName = Capitalizewords(tempOptionName);
                tempOptionName = tempOptionName.Replace(' ', '_');
                tempOptionName = Regex.Replace(tempOptionName, "\\W+", string.Empty);
                tempOptionName = Regex.Replace(tempOptionName, "_+", "_");
            }

            option.OptionName = tempOptionName;
            return option;
        }

        public OptionData BuildOption(OptionMetadata metadata)
        {
            return BuildBaseOption(metadata);
        }

        public OptionData BuildOption(StatusOptionMetadata metadata, OptionSetData state)
        {
            var option = BuildBaseOption(metadata);
            option.OptionName =
                $"{state.Options.Find(s => s.OptionValue == metadata.State).OptionName}_{option.OptionName}";
            return option;
        }
    }
}