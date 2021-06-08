using Microsoft.Xrm.Sdk.Metadata;
using proxygenerator.Data.Model;

namespace proxygenerator.Data.Builder
{
    public interface IEntityBuilder
    {
        EntityData ConstructEntity(EntityMetadata metadata);
        RelatedEntityData ConstructRelatedEntity(EntityMetadata metadata);
    }
}