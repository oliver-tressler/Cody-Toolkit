using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Newtonsoft.Json;
using proxygenerator.Data;
using proxygenerator.Data.Builder.TS;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;
using proxygenerator.Generators.TS;
using proxygenerator.Generators.TS.ActionGenerator;
using proxygenerator.Generators.TS.Entity;
using proxygenerator.Generators.TS.Entity.OptionSets;

namespace proxygenerator
{
    public class ProxyBootstrap
    {
        [JsonObject]
        public class InitActionProxyGenerationResult
        {
            public bool CreatedNewFiles { get; set; }
        }

        private static List<string> ListProxyFileNames(string dir, string language)
        {
            return
                Directory.EnumerateFiles(dir,
                        $"*.{language}", SearchOption.TopDirectoryOnly)
                    .Select(Path.GetFileNameWithoutExtension)
                    .Where(s => !string.IsNullOrWhiteSpace(s) && s != "BaseEntityProxy" && s != "BaseActionProxy")
                    .ToList();
        }

        public static InitActionProxyGenerationResult InitActionProxyGeneration(ActionProxyGenerationOptions options,
            string language,
            IOrganizationService organizationService)
        {
            var createdNewFiles = false;
            var proxyFolderPath = options.Path.Replace("\"", "");
            if (!Directory.Exists(proxyFolderPath))
            {
                throw new DirectoryNotFoundException("Proxy directory not found");
            }
            Directory.CreateDirectory(Path.Combine(proxyFolderPath, "Actions"));
            var proxiesToGenerate = new List<string>();
            // Regenerate all action proxies
            if (options.ActionNames.Length == 0)
            {
                proxiesToGenerate.AddRange(
                    ListProxyFileNames(Path.Combine(options.Path, "Actions"), language));
            }
            else
            {
                proxiesToGenerate.AddRange(options.ActionNames);
            }

            var query = new QueryExpression("workflow");
            query.Criteria.AddCondition("category", ConditionOperator.Equal, 3); // Only actions
            query.ColumnSet.AddColumns("uniquename", "primaryentity", "name", "xaml");
            var messageQuery = query.AddLink("sdkmessage", "sdkmessageid", "sdkmessageid");
            messageQuery.EntityAlias = "message";
            messageQuery.Columns.AddColumns("name");
            messageQuery.LinkCriteria.AddCondition(new ConditionExpression("name", ConditionOperator.In,
                proxiesToGenerate));
            var actions = organizationService.RetrieveMultiple(query).Entities
                .Select(action => new ActionBuilder().ConstructAction(action));
            foreach (var action in actions)
            {
                var fileContent = new Generators.TS.Action.ProxyGenerator(action).Generate();
                if (!createdNewFiles && !File.Exists(
                    Path.Combine(proxyFolderPath, "Actions", $"{action.Name}.{language}")))
                {
                    createdNewFiles = true;
                }

                File.WriteAllText(
                    Path.Combine(proxyFolderPath, "Actions", $"{action.Name}.{language}"),
                    fileContent);
            }

            return new InitActionProxyGenerationResult {CreatedNewFiles = createdNewFiles};
        }

        [JsonObject]
        public class InitEntityProxyGenerationResult
        {
            public bool CreatedNewFiles { get; set; }
        }

        public static InitEntityProxyGenerationResult InitEntityProxyGeneration(EntityProxyGenerationOptions options,
            string language,
            IOrganizationService organizationService)
        {
            var createdNewFiles = false;
            var proxyFolderPath = options.Path.Replace("\"", "");
            if (!Directory.Exists(proxyFolderPath))
            {
                throw new DirectoryNotFoundException("Proxy directory not found");
            }

            Directory.CreateDirectory(Path.Combine(proxyFolderPath, "Entities"));
            var availableProxyFiles =
                ListProxyFileNames(Path.Combine(proxyFolderPath, "Entities"), language);
            var cache = new EntityMetadataCache(organizationService, language, options,
                availableProxyFiles.ToList());
            IEnumerable<EntityData> entityData;
            var optionSets = new List<(string filename, string content)>();
            if (options.EntityLogicalNames == null || options.EntityLogicalNames.Length == 0)
            {
                entityData = cache.GetEntities(availableProxyFiles.ToArray());
            }
            else
            {
                entityData = cache.GetEntities(options.EntityLogicalNames);
            }

            foreach (var entity in entityData)
            {
                CodeGenerator generator = language switch
                {
                    "ts" => new ProxyGenerator(entity),
                    // "cs" => new Generators.CS.EntityGenerator.EntityGenerator(entity, options.ProxyNamespace),
                    _ => throw new ArgumentOutOfRangeException()
                };

                if (!createdNewFiles && !File.Exists(Path.Combine(proxyFolderPath, "Entities",
                    $"{entity.LogicalName}.{language}")))
                {
                    createdNewFiles = true;
                }

                File.WriteAllText(Path.Combine(proxyFolderPath, "Entities", $"{entity.LogicalName}.{language}"),
                    generator.Generate());
                optionSets.AddRange(entity.ExternalOptionSets.Select(eos => (eos.FileName, new CommentGenerator(eos.Comment).Generate() + new ExternalOptionSetGenerator(eos).Generate())));
            }

            try
            {
                Directory.CreateDirectory(Path.Combine(proxyFolderPath, "OptionSets"));
            }
            catch
            {
                throw new Exception("Unable to create enums directory at " + Path.Combine(proxyFolderPath, "OptionSets"));
            }

            optionSets = optionSets
                .GroupBy(os => os.filename)
                .Select(group => group.First()).ToList();
            foreach (var (fileName, content) in optionSets)
            {
                if (!createdNewFiles &&
                    !File.Exists(Path.Combine(proxyFolderPath, "Entities", $"{fileName}.{language}")))
                {
                    createdNewFiles = true;
                }

                File.WriteAllText(
                    Path.Combine(proxyFolderPath, "OptionSets", $"{fileName}.{language}"),
                    content);
            }

            return new InitEntityProxyGenerationResult() {CreatedNewFiles = createdNewFiles};
        }
    }
}