using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Client;
using Microsoft.Xrm.Sdk.Query;
using solutionmanagement.Model;
using utils;
using utils.proxies;
using PluginType = utils.proxies.PluginType;
using SdkMessageProcessingStep = utils.proxies.SdkMessageProcessingStep;
using WebResourceInfo = solutionmanagement.Model.WebResourceInfo;

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

        public IEnumerable<PublisherInfo> GetPublishers(OrganizationServiceContext serviceContext) =>
            (from publisher in serviceContext.CreateQuery<Publisher>()
             orderby publisher.FriendlyName
             select new
             {
                 publisher.FriendlyName,
                 publisher.UniqueName,
                 publisher.Id,
                 publisher.Description,
                 publisher.CustomizationPrefix
             }).ToList().Select(pub => new PublisherInfo
             {
                 Name = pub.FriendlyName,
                 UniqueName = pub.UniqueName,
                 Id = pub.Id,
                 Description = pub.Description,
                 Prefix = pub.CustomizationPrefix
             });

        public IEnumerable<SolutionInfo> GetSolutions(OrganizationServiceContext serviceContext) =>
            (from solution in serviceContext.CreateQuery<Solution>()
             orderby solution.CreatedOn descending
             select new
             {
                 solution.FriendlyName,
                 solution.UniqueName,
                 solution.PublisherId,
                 solution.Version,
                 solution.Description,
                 solution.Id
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

        public IEnumerable<PluginInfo> GetAssemblySteps(IOrganizationService service, Guid assemblyId)
        {
            var queryExpression = new QueryExpression
            {
                EntityName = PluginType.EntityLogicalName,
                ColumnSet = { AllColumns = true }
            };
            queryExpression.Criteria.Conditions.Add(new ConditionExpression(PluginType.Fields.PluginAssemblyId, ConditionOperator.Equal, assemblyId));
            var stepLink = queryExpression.AddLink(SdkMessageProcessingStep.EntityLogicalName,
                SdkMessageProcessingStep.Fields.PluginTypeId, PluginType.PrimaryIdAttribute);
            stepLink.Columns.AllColumns = false;
            stepLink.EntityAlias = "step";
            var filterLink = stepLink.AddLink(SdkMessageFilter.EntityLogicalName, SdkMessageProcessingStep.Fields.SdkMessageFilterId,
                SdkMessageFilter.PrimaryIdAttribute);
            filterLink.Columns.AllColumns = true;
            filterLink.EntityAlias = "filter";
            var retrievedEntities = service.RetrieveMultiple(queryExpression);
            return retrievedEntities.Entities.GroupBy(entity => entity.Id).Select(ConstructPluginInfo);
        }

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
        
        public IEnumerable<AssemblyInfo> GetAssemblies(OrganizationServiceContext serviceContext)
        {
            var assemblies = (from assembly in serviceContext.CreateQuery<PluginAssembly>()
                    where assembly.IsHidden.Value == false
                    select new {assembly.Name, assembly.PluginAssemblyId}).ToList()
                .Select(temp => new AssemblyInfo{Id = temp.PluginAssemblyId, Name = temp.Name})
                .Where(assemblyInfo => !assemblyInfo.Name.StartsWith("Microsoft"));
            return assemblies;
        }

        private PluginInfo ConstructPluginInfo(IGrouping<Guid, Entity> pluginAndStepData)
        {
            var pluginType = pluginAndStepData.First().ToEntity<PluginType>();
                var pluginInfo = new PluginInfo
                {
                    Name = pluginType.Name,
                    Id = pluginType.Id,
                    Steps = new List<StepInfo>()
                };
                foreach (var result in pluginAndStepData)
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
                    if (result.TryGetLinkedEntity(out SdkMessageFilter filter, "filter",
                        SdkMessageFilter.PrimaryIdAttribute))
                    {
                        stepInfo.EntityName = filter.PrimaryObjectTypeCode;
                    }
                    pluginInfo.Steps.Add(stepInfo);
                }
                return pluginInfo;
        }
    }
}
