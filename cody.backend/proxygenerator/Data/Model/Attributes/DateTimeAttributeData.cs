using System;

namespace proxygenerator.Data.Model.Attributes
{
    [Serializable]
    public class DateTimeAttributeData : AttributeData
    {
        public DateTimeType DateTimeType { get; set; }
        public string DateTimeTypeName { get; set; }
    }
}