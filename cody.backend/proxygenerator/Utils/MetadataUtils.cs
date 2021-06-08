using Microsoft.Xrm.Sdk.Metadata;

namespace proxygenerator.Utils
{
    public static class MetadataUtils
    {
        public static string GetDisplayName(this AttributeMetadata attribute)
        {
            return attribute.DisplayName?.UserLocalizedLabel?.Label;
        }

        public static string GetDescription(this AttributeMetadata attribute)
        {
            return attribute.Description?.UserLocalizedLabel?.Label;
        }

        public static string GetDisplayName(this EntityMetadata entity)
        {
            return entity.DisplayName?.UserLocalizedLabel?.Label;
        }

        public static string GetDisplayCollectionName(this EntityMetadata entity)
        {
            return entity.DisplayCollectionName?.UserLocalizedLabel?.Label;
        }


        public static string GetDescription(this EntityMetadata entity)
        {
            return entity.Description?.UserLocalizedLabel?.Label;
        }

        public static string GetOptionSetDisplayName(this OptionSetMetadata optionSet)
        {
            return optionSet.DisplayName?.UserLocalizedLabel?.Label;
        }

        public static string GetOptionDisplayName(this OptionMetadata option)
        {
            return option.Label?.UserLocalizedLabel?.Label;
        }
    }
}