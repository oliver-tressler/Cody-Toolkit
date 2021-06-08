using System;
using System.Collections.Generic;
using proxygenerator.Data.Model.Attributes;

namespace proxygenerator.Data.Model
{
    [Serializable]
    public class RelatedEntityData
    {
        public bool Generate { get; set; }
        public Guid MetadataId { get; set; }
        public string EntitySetName { get; set; }
        public string LogicalName { get; set; }
        public string DisplayName { get; set; }
        public string DisplayCollectionName { get; set; }


        public string PrimaryIdAttributeName { get; set; }
        public string PrimaryNameAttributeName { get; set; }
        public List<AttributeData> Attributes { get; set; }
    }
}