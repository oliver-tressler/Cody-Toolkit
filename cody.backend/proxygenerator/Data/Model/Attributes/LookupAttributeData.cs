using System;

namespace proxygenerator.Data.Model.Attributes
{
    [Serializable]
    public class LookupAttributeData : AttributeData
    {
        public LookupRelationData[] RelationData { get; set; }
    }
}