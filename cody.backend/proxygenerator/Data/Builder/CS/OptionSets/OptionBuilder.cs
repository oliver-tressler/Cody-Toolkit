using System.Text.RegularExpressions;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model.OptionSets;
using proxygenerator.Generators;
using proxygenerator.Utils;
using static Scriban.Functions.StringFunctions;

namespace proxygenerator.Data.Builder.CS.OptionSets
{
    public class OptionBuilder
    {
        private OptionData BuildBaseOption(OptionMetadata metadata)
        {
            var option = new OptionData();
            option.Comment = new Comment(null);
            if (!string.IsNullOrWhiteSpace(metadata.GetOptionDisplayName()))
            {
                option.Comment.CommentParameters.Add(new CommentParameter("para", metadata.GetOptionDisplayName()));
            }

            if (!string.IsNullOrWhiteSpace(metadata.Description?.UserLocalizedLabel?.Label))
            {
                option.Comment.CommentParameters.Add(new CommentParameter("para", metadata.Description.UserLocalizedLabel.Label));
            }
            option.Comment.CommentParameters.Add(new CommentParameter("para", $"Value = {metadata.Value ?? -1}"));
            option.OptionLabel = metadata.Label?.UserLocalizedLabel?.Label;
            option.OptionValue = metadata.Value;
            var tempOptionName = metadata.Label?.UserLocalizedLabel?.Label;
            if (string.IsNullOrWhiteSpace(tempOptionName))
            {
                tempOptionName = "Option_" + metadata.Value;
            }
            else
            {
                tempOptionName = Capitalizewords(tempOptionName);
                tempOptionName = Regex.Replace(tempOptionName, " {2,}", "_");
                tempOptionName = tempOptionName.Replace(" ", "");
                tempOptionName = Regex.Replace(tempOptionName, "[^\\w ]+", "_");
                if (Regex.Match(tempOptionName, "^\\d").Success) tempOptionName = "_" + tempOptionName;
                tempOptionName = Regex.Replace(tempOptionName, "_+", "_");
                tempOptionName = Regex.Replace(tempOptionName, "_$", "");
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