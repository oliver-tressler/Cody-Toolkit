using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Client;
using Microsoft.Xrm.Sdk.Query;
using Newtonsoft.Json;
using utils;
using utils.proxies;
using PluginType = utils.proxies.PluginType;
using SdkMessageProcessingStep = utils.proxies.SdkMessageProcessingStep;

namespace solutionmanagement
{
    public class SolutionManager
    {
        public SolutionInfo CreateSolution(IOrganizationService service, SolutionInfo info)
        {

            var id = service.Create(new Solution
            {
                UniqueName = info.UniqueName,
                Description = info.Description,
                FriendlyName = info.Name,
                Version = info.Version,
                PublisherId = new EntityReference(Publisher.EntityLogicalName, info.Publisher.Id),
            });
            info.Id = id;
            return info;
        }

        //public void DeleteSolution(IOrganizationService service, Guid solutionId)
        //{
        //    service.Delete(Solution.EntityLogicalName, solutionId);
        //}

        public void AddWebResourceToSolution(IOrganizationService service, string solutionUniqueName, Guid webResourceId)
        {
            var req = new AddSolutionComponentRequest
            {
                AddRequiredComponents = false,
                SolutionUniqueName = solutionUniqueName,
                ComponentType = (int)ComponentType.WebResource,
                ComponentId = webResourceId
            };
            service.Execute(req);
        }

        //public void RemoveWebResourceFromSolution(IOrganizationService service, string solutionUniqueName, Guid assemblyId)
        //{
        //    var req = new RemoveSolutionComponentRequest
        //    {
        //        SolutionUniqueName = solutionUniqueName,
        //        ComponentType = (int)ComponentType.PluginAssembly,
        //        ComponentId = assemblyId
        //    };
        //    service.Execute(req);
        //}

        public void AddAssemblyToSolution(IOrganizationService service, string solutionUniqueName, Guid assemblyId)
        {
            var req = new AddSolutionComponentRequest
            {
                AddRequiredComponents = false,
                SolutionUniqueName = solutionUniqueName,
                ComponentType = (int)ComponentType.PluginAssembly,
                ComponentId = assemblyId
            };
            service.Execute(req);
        }

        //public void RemoveAssemblyFromSolution(IOrganizationService service, string solutionUniqueName, Guid assemblyId)
        //{
        //    var req = new RemoveSolutionComponentRequest
        //    {
        //        SolutionUniqueName = solutionUniqueName,
        //        ComponentType = (int)ComponentType.PluginAssembly,
        //        ComponentId = assemblyId
        //    };
        //    service.Execute(req);
        //}

        public void AddStepToSolution(IOrganizationService service, string solutionUniqueName, Guid stepId)
        {
            var req = new AddSolutionComponentRequest
            {
                AddRequiredComponents = false,
                SolutionUniqueName = solutionUniqueName,
                ComponentType = (int)ComponentType.SDKMessageProcessingStep,
                ComponentId = stepId
            };
            service.Execute(req);
        }

        #region Utility
        public IEnumerable<PublisherInfo> GetPublishers(OrganizationServiceContext serviceContext) =>
            (from pub in serviceContext.CreateQuery<Publisher>()
             orderby pub.FriendlyName
             select new
             {
                 pub.FriendlyName,
                 pub.UniqueName,
                 pub.Id,
                 pub.Description,
                 pub.CustomizationPrefix
             }).ToList().Select(pub => new PublisherInfo
             {
                 Name = pub.FriendlyName,
                 UniqueName = pub.UniqueName,
                 Id = pub.Id,
                 Description = pub.Description,
                 Prefix = pub.CustomizationPrefix
             });

        public IEnumerable<SolutionInfo> GetSolutions(OrganizationServiceContext serviceContext) =>
            (from sol in serviceContext.CreateQuery<Solution>()
             orderby sol.CreatedOn descending
             select new
             {
                 sol.FriendlyName,
                 sol.UniqueName,
                 sol.PublisherId,
                 sol.Version,
                 sol.Description,
                 sol.Id
             }).ToList().Select(sol => new SolutionInfo
             {
                 Name = sol.FriendlyName,
                 UniqueName = sol.UniqueName,
                 Publisher = new PublisherInfo
                 {
                     Name = sol.PublisherId.Name,
                     Id = sol.PublisherId.Id
                 },
                 Description = sol.Description,
                 Version = sol.Version,
                 Id = sol.Id
             });

        public List<PluginInfo> GetAssemblySteps(IOrganizationService service, Guid assemblyId, Guid solutionId)
        {
            var ctx = new OrganizationServiceContext(service);
            var components = (from sol in ctx.CreateQuery<SolutionComponent>()
                              where sol.ComponentType == ComponentType.SDKMessageProcessingStep &&
                                    sol.SolutionId.Id == solutionId
                              select sol).ToList();
            var queryExpression = new QueryExpression
            {
                EntityName = PluginType.EntityLogicalName,
                ColumnSet = { AllColumns = true }
            };
            queryExpression.Criteria.Conditions.Add(new ConditionExpression(PluginType.Fields.PluginAssemblyId, ConditionOperator.Equal, assemblyId));
            var stepLink = queryExpression.AddLink(SdkMessageProcessingStep.EntityLogicalName,
                SdkMessageProcessingStep.Fields.PluginTypeId, PluginType.PrimaryIdAttribute);
            stepLink.Columns.AllColumns = true;
            stepLink.EntityAlias = "step";
            var filterLink = stepLink.AddLink(SdkMessageFilter.EntityLogicalName, SdkMessageProcessingStep.Fields.SdkMessageFilterId,
                SdkMessageFilter.PrimaryIdAttribute);
            filterLink.Columns.AllColumns = true;
            filterLink.EntityAlias = "filter";
            var retrievedEntities = service.RetrieveMultiple(queryExpression);
            var processedResponse = new List<PluginInfo>();
            foreach (var resultEntityGroup in retrievedEntities.Entities.GroupBy(entity => entity.Id))
            {
                var pluginType = resultEntityGroup.First().ToEntity<PluginType>();
                var pluginInfo = new PluginInfo
                {
                    Name = pluginType.Name,
                    Id = pluginType.Id,
                    Steps = new List<StepInfo>()
                };
                foreach (var result in resultEntityGroup)
                {
                    if (!result.TryGetLinkedEntity(out SdkMessageProcessingStep step, "step",
                        SdkMessageProcessingStep.PrimaryIdAttribute)) continue;
                    var stepInfo = new StepInfo
                    {
                        MessageName = step.SdkMessageId?.Name,
                        Name = step.Name,
                        Id = step.Id
                    };
                    // ReSharper disable once SwitchStatementHandlesSomeKnownEnumValuesWithDefault
                    if (step.Stage != null)
                    {
                        switch (step.Stage)
                        {
                            case SdkMessageProcessingStep_Stage.Postoperation:
                                stepInfo.Stage = "Post-operation";
                                break;
                            case SdkMessageProcessingStep_Stage.Preoperation:
                                stepInfo.Stage = "Pre-operation";
                                break;
                            case SdkMessageProcessingStep_Stage.Prevalidation:
                                stepInfo.Stage = "Pre-validation";
                                break;
                            default:
                                throw new ArgumentOutOfRangeException();
                        }
                    }

                    stepInfo.AddedToSolution = components.Any(c => c.Id == step.Id);

                    if (result.TryGetLinkedEntity(out SdkMessageFilter filter, "filter",
                        SdkMessageFilter.PrimaryIdAttribute))
                    {
                        stepInfo.EntityName = filter.PrimaryObjectTypeCode;
                    }
                    pluginInfo.Steps.Add(stepInfo);
                }
                processedResponse.Add(pluginInfo);
            }
            return processedResponse;
        }

        #endregion

        public IEnumerable<WebResourceInfo> GetWebResources(OrganizationServiceContext serviceContext)
        {
            var webResources = (from wr in serviceContext.CreateQuery<WebResource>()
                select new
                {
                    wr.Id,
                    wr.Name,
                    wr.Description,
                    wr.DisplayName,
                    wr.WebResourceType
                }).ToList();
            return webResources.Select(wr => new WebResourceInfo
            {
                Id = wr.Id,
                Name = wr.Name,
                Description = wr.Description,
                DisplayName = wr.DisplayName,
                Type = wr.WebResourceType != null ? Enum.GetName(typeof(WebResource_WebResourceType), wr.WebResourceType) : null
            });
        }
    }

    [JsonObject]
    public class WebResourceInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string Description { get; set; }
        public string Type { get; set; }
    }


    [JsonObject]
    public class PublisherInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string UniqueName { get; set; }
        public string Prefix { get; set; }
        public string Description { get; set; }
    }

    [JsonObject]
    public class SolutionInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string UniqueName { get; set; }
        public string Version { get; set; }
        public string Description { get; set; }
        public PublisherInfo Publisher { get; set; }
    }

    [JsonObject]
    public class PluginInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public List<StepInfo> Steps { get; set; }
    }

    [JsonObject]
    public class StepInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string MessageName { get; set; }
        public string Stage { get; set; }
        public string EntityName { get; set; }
        public bool? AddedToSolution { get; set; }
    }
}
