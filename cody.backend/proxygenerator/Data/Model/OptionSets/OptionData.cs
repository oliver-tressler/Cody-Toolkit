using System;
using proxygenerator.Generators;

namespace proxygenerator.Data.Model.OptionSets
{
    [Serializable]
    public class OptionData
    {
        public string OptionName { get; set; }
        public string OptionLabel { get; set; }
        public int? OptionValue { get; set; }
        public Comment Comment { get; set; }
    }
}