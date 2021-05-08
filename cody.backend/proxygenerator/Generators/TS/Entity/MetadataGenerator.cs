using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity
{
    public class MetadataGenerator : CodeGenerator
    {
        public MetadataGenerator(EntityData entity)
        {
            Model = new
            {
                objectTypeCode = entity.ObjectTypeCode,
                className = entity.ClassName,
                logicalName = entity.LogicalName,
                entitySetName = entity.EntitySetName,
                schemaName = entity.SchemaName,
                displayName = entity.DisplayName,
                pluralDisplayName = entity.DisplayCollectionName,
                primaryIdAttribute = entity.PrimaryIdAttributeName,
                primaryNameAttribute = entity.PrimaryNameAttributeName,
                metadataId = entity.MetadataId
            };
        }
        
        public override object Model { get; }
    }
}