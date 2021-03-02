using System;
using System.Collections.Generic;
using proxygenerator.Generators;

namespace proxygenerator.Data.Model.OptionSets
{
    [Serializable]
    public class OptionSetData
    {
        public Comment Comment { get; set; }
        public string EnumName { get; set; }
        public string InternalEnumName { get; set; }
        public string ExposedEnumName { get; set; }
        public string FileName { get; set; }
        public string DisplayName { get; set; }
        public string LogicalName { get; set; }
        public List<OptionData> Options { get; set; }
        public Guid MetadataId { get; set; }
        public bool IsExternal { get; set; }
    }
}