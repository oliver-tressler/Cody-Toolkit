using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.TS.AttributeGenerators;
using proxygenerator.Generators.TS.CollectionFetcherGenerators.Concrete;
using proxygenerator.Generators.TS.PropertyGenerators.Concrete;
using proxygenerator.Utils;
using IEntityGenerator = proxygenerator.Generators.Contract.IEntityGenerator;

namespace proxygenerator.Generators.TS.EntityGenerator
{
    public class EntityGenerator : IEntityGenerator
    {
        private readonly EntityData _data;

        private readonly List<(string[] Classes, string From)> _imports = new List<(string[], string)>
        {
            (new[] {"Guid", "Attribute", "BaseEntityProxy", "LookupAttribute", "EntityReference", "DateTimeAttribute", "DateTimeBehaviour", "OData", "ODataEntityResult"},
                "../core/BaseEntityProxy")
        };

        public EntityGenerator(EntityData data)
        {
            _data = data;
            _imports.AddRange(data.ExternalOptionSets.GroupBy(eos => eos.MetadataId).Select(group =>
            {
                var os = group.First();
                return (
                    new[]
                    {
                        os.EnumName == os.InternalEnumName ? os.EnumName : $"{os.EnumName} as {os.InternalEnumName}"
                    },
                    "../OptionSets/" + os.FileName);
            }));
        }

        public string GenerateEntityCode()
        {
            var code = new StringBuilder();
            code.AppendLine("/* eslint-disable */");
            GenerateImports(code);
            code.AppendLine();
            GenerateClassBody(code);
            return code.ToString();
        }

        private void GenerateImports(StringBuilder code)
        {
            code.AppendLine("// #region Imports");
            foreach (var (classes, file) in _imports)
                code.AppendLine(
                    $"import {{ {string.Join(", ", classes)} }} from \"{file}\";");
            code.AppendLine("// #endregion");
        }

        private void GenerateClassBody(StringBuilder code)
        {
            if (_data.ClassComment.Generate)
                code.AppendLine(_data.ClassComment.GenerateComment(0));
            code.AppendLine($"export class {_data.ClassName} extends BaseEntityProxy {{");
            code.AppendLine(new Comment("Collection of all attributes indexed by their logical name")
                .GenerateComment(1));
            GenerateAttributes(code, 1);
            code.AppendLine();
            code.AppendLine(TextUtils.Indentation(1) + "// #region Properties");
            GenerateProperties(code, 1);
            code.AppendLine(TextUtils.Indentation(1) + "// #endregion");

            code.AppendLine(TextUtils.Indentation(1) + "// #region Metadata");
            GenerateStaticMetadata(code, 1);
            code.AppendLine(TextUtils.Indentation(1) + "// #endregion");
            code.AppendLine();
            GenerateConstructor(code, 1);
            code.AppendLine();
            code.AppendLine(TextUtils.Indentation(1) + "// #region 1:N Fetchers");
            GenerateCollectionFetchers(code, 1);
            code.AppendLine(TextUtils.Indentation(1) + "// #endregion");
            code.AppendLine();
            code.AppendLine(TextUtils.Indentation(1) + "// #region N:N Fetchers");
            GenerateIntersectFetchers(code, 1);
            code.AppendLine(TextUtils.Indentation(1) + "// #endregion");

            code.AppendLine("}");
            code.AppendLine();
            GenerateOptionSets(code);
        }

        private void GenerateProperties(StringBuilder code, int indentationLevel)
        {
            var propertyCode = _data.Attributes.Where(a => a.Generate).Select(attribute =>
            {
                if (attribute is OptionSetAttributeData osaData)
                    return new OptionSetPropertyGenerator(osaData, _data).GenerateAttributeProperties(indentationLevel);

                return new DefaultPropertyGenerator(attribute, _data).GenerateAttributeProperties(indentationLevel);
            });
            code.AppendLine(string.Join(Environment.NewLine, propertyCode));
        }

        private void GenerateAttributes(StringBuilder code, int indentationLevel)
        {
            var i1 = TextUtils.Indentation(indentationLevel);
            var factory = new AttributeGeneratorFactory();
            code.AppendLine(i1 + "static Attributes = {");
            var attributes = string.Join($",{Environment.NewLine}", _data.Attributes.Where(a => a.Generate).Select(
                attribute => factory.GetGenerator(attribute).GenerateAttribute(indentationLevel + 1)));
            code.AppendLine(attributes);
            code.Append(i1 + "}");
        }

        private void GenerateConstructor(StringBuilder code, int indentationLevel)
        {
            var i = TextUtils.Indentation(indentationLevel);
            var i2 = TextUtils.Indentation(indentationLevel + 1);
            var i3 = TextUtils.Indentation(indentationLevel + 2);
            code.AppendLine(
                new Comment($"Create a new {_data.DisplayName}",
                        new CommentParameter("param",
                            "context Either form context, OData result or null (treated as OData)"))
                    .GenerateComment(indentationLevel));
            code.AppendLine(i + "constructor(context?: ODataEntityResult | Xrm.Page){");
            code.AppendLine(i2 + "super({");
            code.AppendLine($"{i3}logicalName: {_data.ClassName}.LogicalName,");
            code.AppendLine($"{i3}entitySetName: {_data.ClassName}.EntitySetName,");
            code.AppendLine($"{i3}objectTypeCode: {_data.ClassName}.ObjectTypeCode,");
            code.AppendLine($"{i3}schemaName: {_data.ClassName}.SchemaName,");
            code.AppendLine($"{i3}displayName: {_data.ClassName}.DisplayName,");
            code.AppendLine($"{i3}pluralDisplayName: {_data.ClassName}.PluralDisplayName,");
            code.AppendLine($"{i3}primaryIdAttribute: {_data.ClassName}.PrimaryIdAttribute,");
            code.AppendLine($"{i3}primaryNameAttribute: {_data.ClassName}.PrimaryNameAttribute,");
            code.AppendLine($"{i3}metadataId: {_data.ClassName}.MetadataId,");
            code.AppendLine(i2 + "},");
            code.AppendLine(i3 + "context)");
            code.AppendLine(i + "}");
        }

        private void GenerateStaticMetadata(StringBuilder sb, int indentationLevel)
        {
            var indentation = TextUtils.Indentation(indentationLevel);
            sb.AppendLine(
                new Comment($"All attributes of the {_data.LogicalName} entity as their odata request names")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation +
                          $"static AllAttributes = Object.keys({_data.ClassName}.Attributes).map(attr => {_data.ClassName}.Attributes[attr as keyof typeof {_data.ClassName}.Attributes].oDataRequestName);");

            sb.AppendLine(
                new Comment($"Object Typecode of the {_data.LogicalName} entity")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation + $"static ObjectTypeCode: number = {_data.ObjectTypeCode ?? -1};");

            sb.AppendLine(
                new Comment($"Logical Name of the {_data.LogicalName} entity")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation + $"static LogicalName: string = \"{_data.LogicalName}\";");

            sb.AppendLine(
                new Comment($"Plural Logical Name of the {_data.LogicalName} entity")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation + $"static EntitySetName: string = \"{_data.EntitySetName}\";");

            sb.AppendLine(
                new Comment($"Schema Name of the {_data.LogicalName} entity")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation + $"static SchemaName: string = \"{_data.SchemaName}\";");

            sb.AppendLine(
                new Comment($"Display Name of the {_data.LogicalName} entity")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation + $"static DisplayName: string = \"{_data.DisplayName}\";");

            sb.AppendLine(
                new Comment($"Plural Display Name of the {_data.LogicalName} entity")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation + $"static PluralDisplayName: string = \"{_data.DisplayCollectionName}\";");

            sb.AppendLine(
                new Comment($"Primary Key Attribute of the {_data.LogicalName} entity")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation +
                          $"static PrimaryIdAttribute: Attribute = {_data.ClassName}.Attributes.{_data.PrimaryIdAttributeName};");

            sb.AppendLine(
                new Comment($"Primary Name Attribute of the {_data.LogicalName} entity")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation +
                          $"static PrimaryNameAttribute: Attribute = {_data.ClassName}.Attributes.{_data.PrimaryNameAttributeName};");

            sb.AppendLine(
                new Comment($"Metadata ID of the {_data.LogicalName} entity")
                    .GenerateComment(indentationLevel));
            sb.AppendLine(indentation + $"static MetadataId: Guid = Guid.parse(\"{_data.MetadataId}\");");
        }

        private void GenerateOptionSets(StringBuilder code)
        {
            code.AppendLine($"export namespace {_data.ClassName}{{");
            foreach (var enumAttributeMetadata in _data.InternalOptionSets)
            {
                if (enumAttributeMetadata.Comment?.Generate == true)
                {
                    code.AppendLine(enumAttributeMetadata.Comment.GenerateComment(1));
                }
                code.AppendLine(
                    $"{TextUtils.Indentation(1)}export enum {enumAttributeMetadata.InternalEnumName}{{");
                code.AppendLine(string.Join("," + Environment.NewLine, enumAttributeMetadata.Options.Select(option =>
                {
                    var oCode = option.Comment?.Generate == true
                        ? option.Comment.GenerateComment(2) + Environment.NewLine
                        : "";
                    oCode += $"{TextUtils.Indentation(2)}{option.OptionName} = {option.OptionValue}";
                    return oCode;
                })));
                code.AppendLine(TextUtils.Indentation(1) + "}");
            }

            code.AppendLine();
            foreach (var externalOptionSet in _data.ExternalOptionSets)
                code.AppendLine(
                    $"{TextUtils.Indentation(1)}export import {externalOptionSet.ExposedEnumName} = {externalOptionSet.InternalEnumName};");

            code.Append("}");
        }

        private void GenerateCollectionFetchers(StringBuilder code, int indentationLevel)
        {
            code.AppendLine(string.Join(Environment.NewLine + Environment.NewLine,
                _data.CollectionFetchers.Where(cf => cf.Generate).Select(cf =>
                {
                    var cfCode = (cf.Comment?.Generate == true
                        ? cf.Comment?.GenerateComment(indentationLevel) + Environment.NewLine
                        : "");
                    cfCode += new DefaultCollectionFetcherGenerator(cf).GenerateCollectionFetcher(indentationLevel);
                    return cfCode;
                })));
        }

        private void GenerateIntersectFetchers(StringBuilder code, int indentationLevel)
        {
            code.AppendLine(string.Join(Environment.NewLine + Environment.NewLine,
                _data.IntersectFetchers.Where(intersectFetcher => intersectFetcher.Generate).Select(intersectFetcher =>
                    new IntersectCollectionFetcherGenerator(intersectFetcher)
                        .GenerateIntersectFetcher(indentationLevel))));
        }

        public IEnumerable<(string FileName, string Content)> GenerateExternalOptionSets()
        {
            var optionSets = _data.ExternalOptionSets;
            var generatedOptionSets = new List<(string FileName, string Content)>(optionSets.Count);
            foreach (var optionSetData in optionSets)
            {
                var sb = new StringBuilder();
                if (optionSetData.Comment?.Generate == true)
                {
                    sb.AppendLine(optionSetData.Comment.GenerateComment(0));
                }
                sb.AppendLine($"export enum {optionSetData.EnumName}{{");
                sb.AppendLine(string.Join($",{Environment.NewLine}", optionSetData.Options.Select(option =>
                {
                    var oCode = option.Comment?.Generate == true ? option.Comment.GenerateComment(1) + Environment.NewLine : "";
                    oCode += $"{TextUtils.Indentation(1)}{option.OptionName} = {option.OptionValue}";
                    return oCode;
                })));
                sb.AppendLine("}");
                generatedOptionSets.Add((optionSetData.LogicalName, sb.ToString()));
            }

            return generatedOptionSets;
        }
    }
}