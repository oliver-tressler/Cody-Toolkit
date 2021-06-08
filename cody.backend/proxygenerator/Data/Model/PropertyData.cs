using System;
using proxygenerator.Generators;

namespace proxygenerator.Data.Model
{
    //get ContractXIMEA():Guid{ return this.getAttributeValue<Guid>(Contract.Attributes.xim_contract_ximeaid); }
    [Serializable]
    public class PropertyData
    {
        public Comment Comment { get; set; }
        public string TypeClass { get; set; }
        public string PropertyName { get; set; }
        public bool Generate { get; set; }
    }

    [Serializable]
    public class StringPropertyData : PropertyData
    {
        public int MaxLength { get; set; }
    }

    [Serializable]
    public class NumericPropertyData : PropertyData
    {
        public string MinValue { get; set; }
        public string MaxValue { get; set; }
    }

    [Serializable]
    public class PrecisionNumericPropertyData : NumericPropertyData
    {
        public int Precision { get; set; }
    }
}