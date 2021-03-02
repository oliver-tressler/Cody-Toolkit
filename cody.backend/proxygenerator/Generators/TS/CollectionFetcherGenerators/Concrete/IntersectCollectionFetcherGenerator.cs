using System.Text;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Utils;

namespace proxygenerator.Generators.TS.CollectionFetcherGenerators.Concrete
{
    //async GetTestEntityA_Intersect(...attributes: string[]|Attribute[]): Promise<ODataEntityResult[]>{
    //  return await OData.retrieveIntersect(TestEntityB.EntitySetName, this.id, "xim_testentityb_testentitya", attributes);
    //}
    public class IntersectCollectionFetcherGenerator
    {
        private readonly IntersectFetcherData _fetcher;

        public IntersectCollectionFetcherGenerator(IntersectFetcherData data)
        {
            _fetcher = data;
        }

        public string GenerateIntersectFetcher(int indentationLevel)
        {
            var i1 = TextUtils.Indentation(indentationLevel);
            var i2 = TextUtils.Indentation(indentationLevel + 1);
            var code = new StringBuilder();
            code.AppendLine(
                $"{i1}async GetAssociated_{_fetcher.RelatedEntityCollectionCodeName}(attributes?: (string|Attribute)[]): Promise<ODataEntityResult[]>{{");
            code.AppendLine(
                $"{i2}return await OData.retrieveIntersect(\"{_fetcher.EntitySetName}\", this.id, \"{_fetcher.RelationShipName}\", attributes);");
            code.Append($"{i1}}}");
            return code.ToString();
        }
    }
}