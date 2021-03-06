using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web.Http;
using crmconnector;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata.Query;
using Microsoft.Xrm.Sdk.Query;
using Newtonsoft.Json;
using proxygenerator;
using proxygenerator.Data;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;
using utils;

namespace cody.backend.api.Controllers
{
    public class ProxyGenerationController : ApiController
    {
        [HttpPost]
        public IHttpActionResult Generate(ProxyGenerationOptions options)
        {
            try
            {
                if (!Directory.Exists(options.Path.Replace("\"", "")))
                {
                    throw new Exception("Directory not found");
                }
                var connection = ConnectionCache.Instance.Value.GetOrganizationService(options.Organization);
                Console.WriteLine();
                var availableProxyFiles =
                    Directory.EnumerateFiles(options.Path.Replace("\"", ""),
                            options.Language == eLanguage.Typescript ? "*.ts" : "*.cs", SearchOption.TopDirectoryOnly)
                        .Select(Path.GetFileNameWithoutExtension)
                        .Where(s => !string.IsNullOrWhiteSpace(s) && s != "BaseProxyClass").ToList();
                var cache = new EntityMetadataCache(connection, options, availableProxyFiles.ToList());
                IEnumerable<EntityData> entityData;
                List<(string filename, string content)> optionSets = new List<(string, string)>();
                options.Path = options.Path.Replace("\"", "");
                if (options.EntityLogicalNames == null || options.EntityLogicalNames.Length == 0)
                {

                    entityData = cache.GetEntities(availableProxyFiles
                        .Select(Path.GetFileNameWithoutExtension).ToArray());
                }
                else
                {
                    entityData = cache.GetEntities(options.EntityLogicalNames);
                }
                foreach (var entity in entityData)
                {
                    ConsoleHelper.RefreshLine($"Writing {entity.LogicalName} to file");
                    IEntityGenerator generator;
                    string extension;
                    switch (options.Language)
                    {
                        case eLanguage.Typescript:
                            generator = new proxygenerator.Generators.TS.EntityGenerator.EntityGenerator(entity);
                            extension = "ts";
                            break;
                        case eLanguage.CSharpCrmToolkit:
                            generator = new proxygenerator.Generators.CS.EntityGenerator.EntityGenerator(entity, options.ProxyNamespace);
                            extension = "cs";
                            break;
                        default:
                            throw new ArgumentOutOfRangeException();
                    }
                    
                    File.WriteAllText($"{options.Path.Replace("\"","")}/{entity.LogicalName}.{extension}", generator.GenerateEntityCode());
                    optionSets.AddRange(generator.GenerateExternalOptionSets());
                    ConsoleHelper.RefreshLine($"{entity.LogicalName}.{extension} created");
                    Console.WriteLine();
                }
                try
                {
                    Directory.CreateDirectory(options.Path.Replace("\"","") + "/Enums");
                }
                catch
                {
                    throw new Exception("Unable to create enums directory at " + options.Path + "/Enums");
                }

                optionSets = optionSets
                    .GroupBy(os => os.filename)
                    .Select(group => group.First()).ToList();
                foreach (var (fileName, content) in optionSets)
                {
                    ConsoleHelper.RefreshLine($"Writing global option set {fileName} to file");
                    File.WriteAllText($"{options.Path.Replace("\"", "")}/Enums/{fileName}.{(options.Language == eLanguage.Typescript ? "ts" : "cs")}", content);
                    ConsoleHelper.RefreshLine($"{fileName}.ts created");
                    Console.WriteLine();
                }
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return InternalServerError(e);
            }
            return Ok();
        }

        [HttpGet]
        public IHttpActionResult AvailableEntities(string organization)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            RetrieveMetadataChangesRequest request = new RetrieveMetadataChangesRequest
            {
                Query = new EntityQueryExpression()
                {
                    Criteria = new MetadataFilterExpression(LogicalOperator.And)
                    {
                        Conditions =
                        {
                            new MetadataConditionExpression("IsPrivate",
                                MetadataConditionOperator.Equals, false),
                            new MetadataConditionExpression("IsIntersect",
                                MetadataConditionOperator.Equals, false),
                            new MetadataConditionExpression("IsBPFEntity",
                                MetadataConditionOperator.Equals, false)
                        }
                    },
                    Properties = new MetadataPropertiesExpression("LogicalName", "DisplayName", "Description")
                }
            };
            return !(conn.Execute(request) is RetrieveMetadataChangesResponse newResponse)
                ? InternalServerError(new Exception("No response")) as IHttpActionResult
                : Ok(newResponse.EntityMetadata.Select(em => new AvailableEntityResult
                {
                    DisplayName = em.DisplayName?.UserLocalizedLabel?.Label,
                    Description = em.Description?.UserLocalizedLabel?.Label, LogicalName = em.LogicalName
                }).OrderBy(em => em.LogicalName).ToList());
        }

        [JsonObject]
        public class AvailableEntityResult
        {
            public string LogicalName { get; set; }
            public string DisplayName { get; set; }
            public string Description { get; set; }
        }
    }
}