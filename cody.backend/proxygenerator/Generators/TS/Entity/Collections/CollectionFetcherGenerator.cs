using proxygenerator.Data.Model.Collections;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Collections
{
    public class CollectionFetcherGenerator : CodeGenerator
    {
        public CollectionFetcherGenerator(CollectionFetcherData collectionFetcherData)
        {
            Model = new
            {
                collectionEntityPluralCodeName = collectionFetcherData.CollectionEntityPluralCodeName,
                relatedAttributeCodeName = collectionFetcherData.RelatedAttributeCodeName,
                relatedEntitySetName = collectionFetcherData.RelatedEntitySetName,
                relatedAttributeLogicalName = collectionFetcherData.RelatedAttributeLogicalName
            };
        }
        
        public override object Model { get; }
    }
}