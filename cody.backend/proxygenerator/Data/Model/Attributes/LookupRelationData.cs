using System;

namespace proxygenerator.Data.Model.Attributes
{
    [Serializable]
    public class LookupRelationData
    {
        //public string RelationShipSchemaName { get; set; }
        public string ReferencedEntityLogicalName { get; set; }
        public string ReferencedEntitySetName { get; set; }
        public string ReferencedEntityDisplayName { get; set; }
        public string ReferencedAttributeLogicalName { get; set; }
        public string ReferencedAttributeDisplayName { get; set; }
    }
}