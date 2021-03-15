using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using proxygenerator.Data;
using proxygenerator.Data.Builder.TS;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;
using proxygenerator.Generators.TS.ActionGenerator;

namespace proxygenerator
{
    public class ProxyBootstrap
    {
        private static List<string> ListProxyFileNames(string dir, string language)
        {
            return
                Directory.EnumerateFiles(dir,
                        $"*.{language}", SearchOption.TopDirectoryOnly)
                    .Select(Path.GetFileNameWithoutExtension)
                    .Where(s => !string.IsNullOrWhiteSpace(s) && s != "BaseEntityProxy" && s != "BaseActionProxy")
                    .ToList();
        }

        public static void InitActionProxyGeneration(ActionProxyGenerationOptions options, string language,
            IOrganizationService organizationService)
        {
            var proxyFolderPath = options.Path.Replace("\"", "");
            if (!Directory.Exists(proxyFolderPath))
            {
                throw new DirectoryNotFoundException("Proxy directory not found");
            }

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
            messageQuery.LinkCriteria.AddCondition(new ConditionExpression("name", ConditionOperator.In, proxiesToGenerate));
            var actions = organizationService.RetrieveMultiple(query).Entities
                .Select(action => new ActionBuilder().ConstructAction(action));
            foreach (var action in actions)
            {
                var fileContent = new ActionGenerator(action).GenerateActionCode();
                File.WriteAllText(
                    Path.Combine($"{proxyFolderPath}", "Actions", $"{action.Name}.{language}"),
                    fileContent);
            }
        }
        
        public static void InitEntityProxyGeneration(EntityProxyGenerationOptions options, string language,
            IOrganizationService organizationService)
        {
            var proxyFolderPath = options.Path.Replace("\"", "");
            if (!Directory.Exists(proxyFolderPath))
            {
                throw new DirectoryNotFoundException("Proxy directory not found");
            }
            
            var availableProxyFiles =
                ListProxyFileNames(Path.Combine(options.Path, "Entities"), language);
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
                IEntityGenerator generator = language switch
                {
                    "ts" => new Generators.TS.EntityGenerator.EntityGenerator(entity),
                    "cs" => new Generators.CS.EntityGenerator.EntityGenerator(entity, options.ProxyNamespace),
                    _ => throw new ArgumentOutOfRangeException()
                };

                File.WriteAllText(Path.Combine($"{proxyFolderPath}", "Entities", $"{entity.LogicalName}.{language}"),
                    generator.GenerateEntityCode());
                optionSets.AddRange(generator.GenerateExternalOptionSets());
            }

            try
            {
                Directory.CreateDirectory(Path.Combine(proxyFolderPath, "OptionSets"));
            }
            catch
            {
                throw new Exception("Unable to create enums directory at " + Path.Combine(options.Path, "OptionSets"));
            }

            optionSets = optionSets
                .GroupBy(os => os.filename)
                .Select(group => group.First()).ToList();
            foreach (var (fileName, content) in optionSets)
            {
                File.WriteAllText(
                    Path.Combine($"{proxyFolderPath}", "OptionSets", $"{fileName}.{language}"),
                    content);
            }
        }
    }
}