using System.Collections.Generic;
using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;
using proxygenerator.Generators.TS.Entity.Attributes;
using proxygenerator.Generators.TS.Entity.Collections;
using proxygenerator.Generators.TS.Entity.Properties;

namespace proxygenerator.Generators.TS.Entity
{
    public class EntityClassGenerator : CodeGenerator
    {
        public EntityClassGenerator(EntityData entity)
        {
            Model = new
            {
                className = entity.ClassName
            };
            Children = new List<CodeGenerator>
            {
                new CommentGenerator(
                    new Comment("Collection of all attributes indexed by their logical name")),
                new AttributesGenerator(entity),
                new MetadataGenerator(entity),
                new CommentGenerator(new Comment($"Create a new "+entity.DisplayName, new CommentParameter("param", "context Either form context, OData result or null (treated as OData)"))),
                new ConstructorGenerator(entity),
                new PropertiesContainerGenerator(entity),
                new CollectionFetcherContainerGenerator(entity),
                new IntersectFetcherContainerGenerator(entity)
            }.ToList();
        }

        public override object Model { get; }
    }
}