using System.Text;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Utils;

namespace proxygenerator.Generators.CS.CollectionFetcherGenerators.Concrete
{
    public class DefaultCollectionFetcherGenerator
    {
        private readonly CollectionFetcherData _fetcher;

        public DefaultCollectionFetcherGenerator(CollectionFetcherData data)
        {
            _fetcher = data;
        }

        public string GenerateCollectionFetcher(int indentationLevel)
        {
            var sb = new StringBuilder();
            sb.AppendLine(_fetcher.Comment.GenerateXmlSummaryComment(indentationLevel));
            sb.Append(TextUtils.Indentation(indentationLevel)+
                $"public List<{_fetcher.CollectionEntityClassName}> Get{_fetcher.CollectionEntityPluralCodeName}_{_fetcher.RelatedAttributeCodeName} (IOrganizationService Service, ColumnSet Columns)");
            sb.Append($" {{ return BaseProxyClass.GetRelatedOneToManyEntities");
            if (_fetcher.CollectionEntityClassName != "Entity")
                sb.Append($"<{_fetcher.CollectionEntityClassName}>");
            sb.Append($"(Service, this.Id, \"{_fetcher.RelatedEntityLogicalName}\", \"{_fetcher.RelatedAttributeLogicalName}\", Columns); }}");
            sb.AppendLine();
            sb.Append(TextUtils.Indentation(indentationLevel));
            sb.Append(
                $"public List<{_fetcher.CollectionEntityClassName}> Get{_fetcher.CollectionEntityPluralCodeName}_{_fetcher.RelatedAttributeCodeName} (IOrganizationService Service, params string[] Columns)");
            sb.Append($" {{ return BaseProxyClass.GetRelatedOneToManyEntities");
            if (_fetcher.CollectionEntityClassName != "Entity")
                sb.Append($"<{_fetcher.CollectionEntityClassName}>");
            sb.Append($"(Service, this.Id, \"{_fetcher.RelatedEntityLogicalName}\", \"{_fetcher.RelatedAttributeLogicalName}\", Columns); }}");
            return sb.ToString();
        }
    }
}