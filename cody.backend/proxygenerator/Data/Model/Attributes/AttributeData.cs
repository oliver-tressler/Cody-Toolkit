using System;
using proxygenerator.Generators;

namespace proxygenerator.Data.Model.Attributes
{
    [Serializable]
    public class AttributeData
    {
        public string LogicalName { get; set; }
        public string AttributeType { get; set; }
        public int AttributeTypeCode { get; set; }
        public string SchemaName { get; set; }
        public string ODataRequestName { get; set; }
        public string DisplayName { get; set; }
        public string CodeName { get; set; }
        public bool Generate { get; set; }
        public Guid MetadataId { get; set; }

        public Comment Comment { get; set; }
        public PropertyData Getter { get; set; }
        public PropertyData FormattedGetter { get; set; }
        public PropertyData Setter { get; set; }
    }

    [Serializable]
    public class StringAttributeData : AttributeData
    {
        public int MaxLength { get; set; }
        //public new StringPropertyData Getter { get; set; }
        //public new StringPropertyData Setter { get; set; }
    }

    [Serializable]
    public class NumericAttributeData : AttributeData
    {
        public string MinValue { get; set; }
        public string MaxValue { get; set; }
        //public new NumericPropertyData Getter { get; set; }
        //public new NumericPropertyData Setter { get; set; }
    }

    [Serializable]
    public class PrecisionNumericAttributeData : NumericAttributeData
    {
        public int Precision { get; set; }
        //public new PrecisionNumericPropertyData Getter { get; set; }
        //public new PrecisionNumericPropertyData Setter { get; set; }
    }

    [Serializable]
    public class MoneyAttributeData : PrecisionNumericAttributeData
    {

    }
}