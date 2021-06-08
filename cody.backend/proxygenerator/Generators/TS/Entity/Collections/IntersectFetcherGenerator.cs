using proxygenerator.Data.Model.Collections;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Collections
{
    public class IntersectFetcherGenerator : CodeGenerator
    {
        public IntersectFetcherGenerator(IntersectFetcherData intersectFetcher)
        {
            Model = new
            {
                relatedEntityCollectionCodeName = intersectFetcher.RelatedEntityCollectionCodeName,
                entitySetName = intersectFetcher.EntitySetName,
                relationshipName = intersectFetcher.RelationshipName,
            };
        }
        
        public override object Model { get; }
    }
}