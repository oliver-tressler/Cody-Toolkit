using System.Text;
using proxygenerator.Data.Model.Collections;
using proxygenerator.Utils;

namespace proxygenerator.Generators.TS.CollectionFetcherGenerators.Concrete
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
            var i1 = TextUtils.Indentation(indentationLevel);
            var i2 = TextUtils.Indentation(indentationLevel + 1);
            var code = new StringBuilder();
            code.AppendLine(
                $"{i1}async Get{_fetcher.CollectionEntityPluralCodeName}_{_fetcher.RelatedAttributeCodeName}(attributes?: (string|Attribute)[], filter?: string, orderBy?: string): Promise<ODataEntityResult[]>{{");
            code.AppendLine(
                $"{i2}return await OData.retrieveMultiple(\"{_fetcher.RelatedEntitySetName}\", attributes, `_{_fetcher.RelatedAttributeLogicalName}_value eq ${{this.id}}${{filter?.trim() ? \" and \" + filter.trim() : \"\"}}`, orderBy);");
            code.Append($"{i1}}}");
            return code.ToString();
        }
    }
}