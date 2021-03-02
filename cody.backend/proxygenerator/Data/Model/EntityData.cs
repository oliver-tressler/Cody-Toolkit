using System;
using System.Collections.Generic;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Data.Model.OptionSets;
using proxygenerator.Generators;

namespace proxygenerator.Data.Model
{
    [Serializable]
    public class EntityData : RelatedEntityData
    {
        public Comment ClassComment { get; set; }
        public string SchemaName { get; set; }
        public string ClassName { get; set; }
        public int? ObjectTypeCode { get; set; }

        public List<CollectionFetcherData> CollectionFetchers { get; set; }
        public List<IntersectFetcherData> IntersectFetchers { get; set; }

        public List<OptionSetData> InternalOptionSets { get; set; }
        public List<OptionSetData> ExternalOptionSets { get; set; }
    }
}