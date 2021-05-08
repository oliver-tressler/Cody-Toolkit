using System;
using proxygenerator.Generators;

namespace proxygenerator.Data.Model.Collections
{
    [Serializable]
    public class IntersectFetcherData
    {
        public Comment Comment { get; set; }
        public bool Generate { get; set; }
        public string EntityLogicalName { get; set; }
        public string EntitySetName { get; set; }
        public string EntityClassName { get; set; }
        public string EntityCollectionCodeName { get; set; }
        public string EntityAttribute { get; set; }

        public string RelationshipName { get; set; }
        public string RelationEntityLogicalName { get; set; }
        public string RelationEntityAttribute { get; set; }
        public string RelationRelatedEntityAttribute { get; set; }

        public string RelatedEntityLogicalName { get; set; }
        public string RelatedEntityCollectionCodeName { get; set; }
        public string RelatedEntityClassName { get; set; }
        public string RelatedEntityAttribute { get; set; }
        public Guid MetadataId { get; set; }
    }
}