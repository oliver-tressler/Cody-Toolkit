using System;
using proxygenerator.Generators;

namespace proxygenerator.Data.Model.Collections
{
    [Serializable]
    public class CollectionFetcherData
    {
        public Comment Comment { get; set; }
        public string CollectionEntityPluralDisplayName { get; set; }
        public string RelatedAttributeDisplayName { get; set; }
        public string RelatedAttributeName { get; set; }
        public string RelatedEntitySetName { get; set; }
        public string RelatedEntityLogicalName { get; set; }
        public string RelatedAttributeLogicalName { get; set; }
        public string RelatedAttributeCodeName { get; set; }
        public string CollectionEntityClassName { get; set; }
        public string CollectionEntityPluralCodeName { get; set; }
        public Guid MetadataId { get; set; }

        public bool Generate { get; set; }
    }
}