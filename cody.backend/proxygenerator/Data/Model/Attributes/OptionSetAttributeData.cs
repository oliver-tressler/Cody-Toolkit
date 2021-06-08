using System;
using proxygenerator.Data.Model.OptionSets;

namespace proxygenerator.Data.Model.Attributes
{
    [Serializable]
    public class OptionSetAttributeData : AttributeData
    {
        public OptionSetData OptionSet { get; set; }
    }
}