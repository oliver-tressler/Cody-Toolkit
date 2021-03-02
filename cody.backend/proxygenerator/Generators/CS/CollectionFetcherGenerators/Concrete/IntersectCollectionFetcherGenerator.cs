using System.Text;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Utils;

namespace proxygenerator.Generators.CS.CollectionFetcherGenerators.Concrete
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
            var i = TextUtils.Indentation(indentationLevel);
            var generic = _fetcher.RelatedEntityClassName == "Entity"
                ? string.Empty
                : $"<{_fetcher.RelatedEntityClassName}>";
            var body = $"return BaseProxyClass.GetRelatedManyToManyEntities{generic}(Service, this, \"{_fetcher.EntitySetName}\", \"{_fetcher.EntityAttribute}\", \"{_fetcher.RelatedEntityLogicalName}\", \"{_fetcher.RelatedEntityAttribute}\", \"{_fetcher.RelationEntityLogicalName}\", \"{_fetcher.RelationEntityAttribute}\", \"{_fetcher.RelationRelatedEntityAttribute}\", Columns);";
            var code = new StringBuilder();
            code.AppendLine(_fetcher.Comment.GenerateXmlSummaryComment(indentationLevel));
            code.AppendLine(
                $"{i}public List<{_fetcher.RelatedEntityClassName}> Get{_fetcher.RelatedEntityCollectionCodeName} (IOrganizationService Service, params string[] Columns) {{ {body} }}");
            code.AppendLine();
            code.AppendLine(
                $"{i}public List<{_fetcher.RelatedEntityClassName}> Get{_fetcher.RelatedEntityCollectionCodeName} (IOrganizationService Service, ColumnSet Columns) {{ {body} }}");

            code.AppendLine($"{i}public void Relate{_fetcher.RelatedEntityCollectionCodeName} (IOrganizationService Service, params Entity[] Items) {{ Service.RelateEntities(this, \"{_fetcher.RelationShipName}\", Items); }}");
            code.AppendLine($"{i}public void Relate{_fetcher.RelatedEntityCollectionCodeName} (IOrganizationService Service, params EntityReference[] Items) {{ Service.RelateEntities(this, \"{_fetcher.RelationShipName}\", Items); }}");
            code.AppendLine($"{i}public void UnRelate{_fetcher.RelatedEntityCollectionCodeName} (IOrganizationService Service, params Entity[] Items) {{ Service.UnRelateEntities(this, \"{_fetcher.RelationShipName}\", Items); }}");
            code.AppendLine($"{i}public void UnRelate{_fetcher.RelatedEntityCollectionCodeName} (IOrganizationService Service, params EntityReference[] Items) {{ Service.UnRelateEntities(this, \"{_fetcher.RelationShipName}\", Items); }}");
            return code.ToString();
        }
    }
}