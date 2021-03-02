using System;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model.OptionSets;
using proxygenerator.Generators;
using static Scriban.Functions.StringFunctions;

namespace proxygenerator.Data.Builder.CS.OptionSets
{
    internal class OptionSetBuilder
    {
        private readonly bool _globalEnums;

        public OptionSetBuilder(bool globalEnums)
        {
            _globalEnums = globalEnums;
        }
        public OptionSetData BuildOptionSet(OptionSetMetadata metadata)
        {
            var optionBuilder = new OptionBuilder();
            var data = BuildBaseOptionSet(metadata);
            data.Options = metadata.Options.Select(option => optionBuilder.BuildOption(option)).ToList();
            return data;
        }

        public OptionSetData BuildStatusReasonOptionSet(OptionSetMetadata metadata, OptionSetData state)
        {
            var optionBuilder = new OptionBuilder();
            var data = BuildBaseOptionSet(metadata);
            data.Options = metadata.Options.OfType<StatusOptionMetadata>()
                .Select(option => optionBuilder.BuildOption(option, state)).ToList();
            return data;
        }

        private OptionSetData BuildBaseOptionSet(OptionSetMetadata metadata)
        {
            var data = new OptionSetData();
            data.IsExternal = _globalEnums && (metadata.IsGlobal ?? false);
            data.MetadataId = metadata.MetadataId ?? Guid.Empty;
            var internalDisplayName = metadata.DisplayName?.UserLocalizedLabel?.Label;
            data.DisplayName = internalDisplayName ?? "No display name";
            data.LogicalName = metadata.Name;
            var tempEnumName = internalDisplayName;
            if (string.IsNullOrWhiteSpace(tempEnumName))
            {
                tempEnumName = metadata.Name;
                tempEnumName = tempEnumName.Replace("_", " ");
                tempEnumName = Capitalizewords(tempEnumName);
                tempEnumName = tempEnumName.Replace(" ", "");
            }
            else
            {
                tempEnumName = Capitalizewords(tempEnumName);
                tempEnumName = tempEnumName.Replace(" ", "");
                tempEnumName = Regex.Replace(tempEnumName, "[^A-Za-z0-9]+", "_");
                tempEnumName = Regex.Replace(tempEnumName, "(^_|_$)", "");
            }

            data.EnumName = "e" + tempEnumName;
            data.InternalEnumName = data.EnumName;
            if (data.IsExternal) data.InternalEnumName = "g" + data.EnumName;
            data.ExposedEnumName = data.EnumName;
            data.FileName = data.LogicalName;
            data.Comment = new Comment(metadata.Description?.UserLocalizedLabel?.Label);
            if (!string.IsNullOrWhiteSpace(data.DisplayName))
                data.Comment.CommentParameters.Add(new CommentParameter("displayName", data.DisplayName));
            return data;
        }
    }
}