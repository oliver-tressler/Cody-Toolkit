using System.Collections.Generic;
using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Data.Model.OptionSets;

namespace proxygenerator.Data.Builder {
    interface IAttributeBuilder
    {
        AttributeData BuildAttribute(AttributeMetadata metadata);

        DateTimeAttributeData BuildDateTimeAttribute(DateTimeAttributeMetadata metadata);

        LookupAttributeData BuildLookupAttribute(LookupAttributeMetadata metadata,
            IEnumerable<(OneToManyRelationshipMetadata relationship, RelatedEntityData relatedEntity)> relationships);

        AttributeData BuildPartyListAttribute(LookupAttributeMetadata partyLookupAttributeMetadata,
            IEnumerable<RelatedEntityData> targetEntities);

        OptionSetAttributeData BuildOptionSetAttribute(EnumAttributeMetadata metadata, OptionSetData optionSet);

        AttributeData BuildBooleanAttribute(BooleanAttributeMetadata metadata);

        AttributeData BuildNumericAttribute(BigIntAttributeMetadata metadata);

        AttributeData BuildNumericAttribute(DecimalAttributeMetadata metadata);

        AttributeData BuildNumericAttribute(DoubleAttributeMetadata metadata);

        AttributeData BuildNumericAttribute(IntegerAttributeMetadata metadata);

        AttributeData BuildNumericAttribute(MoneyAttributeMetadata metadata);

        AttributeData BuildStringAttribute(StringAttributeMetadata metadata);
    }
}
