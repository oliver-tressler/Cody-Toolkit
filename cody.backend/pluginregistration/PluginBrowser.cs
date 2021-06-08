using System;
using Microsoft.Xrm.Sdk.Client;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata;
using Microsoft.Xrm.Sdk.Metadata.Query;
using Microsoft.Xrm.Sdk.Query;
using Newtonsoft.Json;
using pluginregistration.Model;
using utils.proxies;
using PluginAssembly = utils.proxies.PluginAssembly;
using PluginType = utils.proxies.PluginType;
using SdkMessage = utils.proxies.SdkMessage;
using SdkMessageProcessingStep = utils.proxies.SdkMessageProcessingStep;

namespace pluginregistration
{
    public class PluginBrowser
    {
        private const int MinimumElapsedTime = 5000;

        #region Assembly

        public FileSystemWatcher WatchPluginAssembly(IOrganizationService service, Guid assemblyId,
            PluginAssemblyInfo info, bool autoRemove)
        {
            if (string.IsNullOrWhiteSpace(info.FilePath)) return null;
            var dir = Path.GetDirectoryName(info.FilePath) ?? throw new DirectoryNotFoundException("Invalid Path (dir)");
            var file = Path.GetFileName(info.FilePath);
            if (string.IsNullOrWhiteSpace(file)) throw new FileNotFoundException("Invalid Path (file)");
            var fsw = new FileSystemWatcher(dir)
            {
                EnableRaisingEvents = true,
                Filter = file,
                IncludeSubdirectories = false,
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.Size
            };
            fsw.Changed += async (_, args) =>
            {
                if ((args.ChangeType & WatcherChangeTypes.Deleted) != 0 || (args.ChangeType & WatcherChangeTypes.Renamed) != 0){
                    fsw.Dispose();
                    return;
                }
                var startMs = DateTime.Now;
                var assembly = service.Retrieve(PluginAssembly.EntityLogicalName, assemblyId, new ColumnSet(true)).ToEntity<PluginAssembly>();
                var inUse = false;
                // Check in use
                FileStream stream = null;
                try
                {
                    var fileInfo = new FileInfo(info.FilePath);
                    stream = fileInfo.Open(FileMode.Open, FileAccess.ReadWrite, FileShare.None);
                }
                catch (IOException)
                {
                    inUse = true;
                }

                finally { stream?.Dispose(); }
                if (inUse) return;
                Console.WriteLine("Updating assembly");
                fsw.EnableRaisingEvents = false;
                UpdateAssemblyContent(service, info, assembly, autoRemove);
                service.Update(assembly);
                var endMs = DateTime.Now;
                var elapsed = endMs - startMs;
                var additionalDelay = MinimumElapsedTime - (int)Math.Ceiling(elapsed.TotalMilliseconds);
                if (additionalDelay > 0)
                    await Task.Delay(additionalDelay);
                fsw.EnableRaisingEvents = true;
            };
            return fsw;
        }

        public PluginAssemblyInfo FetchPluginAssembly(IOrganizationService service, Guid assemblyId)
        {
            var assembly = service.Retrieve(PluginAssembly.EntityLogicalName, assemblyId, new ColumnSet(true)).ToEntity<PluginAssembly>();
            if (assembly == null) throw new Exception("Assembly not found");
            return new PluginAssemblyInfo(assembly);
        }

        public Guid CreatePluginAssembly(IOrganizationService service, PluginAssemblyInfo assembly)
        {
            var metadata = GetAssemblyMetadata(assembly.FilePath);
            var entity = new PluginAssembly
            {
                Name = metadata.AssemblyName,
                IsolationMode = assembly.IsSandboxed
                    ? PluginAssembly_IsolationMode.Sandbox
                    : PluginAssembly_IsolationMode.None,
                SourceType = (PluginAssembly_SourceType)assembly.DeploymentMode,
                Version = metadata.Version,
                Culture = metadata.Culture,
                PublicKeyToken = metadata.PublicKeyToken
            };

            var bytes = File.ReadAllBytes(assembly.FilePath.Replace("\"", string.Empty));
            entity.Content = Convert.ToBase64String(bytes);
            entity.PluginAssemblyId = entity.Id = service.Create(entity);

            foreach (var additionalPlugin in metadata.DetectedPluginTypes)
            {
                service.Create(new PluginType
                {
                    Name = additionalPlugin.Name,
                    FriendlyName = additionalPlugin.Name,
                    PluginAssemblyId = entity.ToEntityReference(),
                    TypeName = additionalPlugin.FullName,
                    Description = additionalPlugin.FullName
                });
            }

            assembly.Metadata = metadata;
            return entity.Id;
        }

        public PluginAssembly UpdatePluginAssembly(IOrganizationService orgService, Guid assemblyId, PluginAssemblyInfo assemblyInfo)
        {
            var assembly = orgService.Retrieve(PluginAssembly.EntityLogicalName, assemblyId, new ColumnSet(true))
                .ToEntity<PluginAssembly>();
            assembly.IsolationMode = assemblyInfo.IsSandboxed
                ? PluginAssembly_IsolationMode.Sandbox
                : PluginAssembly_IsolationMode.None;
            assembly.SourceType = (PluginAssembly_SourceType)assemblyInfo.DeploymentMode;
            if (!string.IsNullOrWhiteSpace(assemblyInfo.FilePath))
            {
                UpdateAssemblyContent(orgService, assemblyInfo, assembly, true);
            }
            else
            {
                orgService.Update(assembly);
            }
            return assembly;
        }

        private void UpdateAssemblyContent(IOrganizationService service,
            PluginAssemblyInfo localAssembly, PluginAssembly crmAssembly, bool autoRemove)
        {
            var localAssemblyMetadata = GetAssemblyMetadata(localAssembly.FilePath.Replace("\"", string.Empty));
            var result = GetDifferenceBetweenLocalAndServerAssembly(localAssembly, crmAssembly);
            if (!autoRemove && result.MissingLocal.Count > 0) return;
            var crmPlugins = crmAssembly.GetPlug_inTypes_PluginAssembly(service, new ColumnSet(true));
            foreach (var plugInType in result.MissingServer)
            {
                var matchingCrmPlugin = crmPlugins.First(type => type.TypeName == plugInType.FullName);
                // TODO: Make this a query expression using links
                var steps = matchingCrmPlugin.GetSdkMessageProcessingSteps_Plug_InType(service, new ColumnSet(true));
                var images = steps.SelectMany(step =>
                    step.GetSdkMessageProcessingStepImages_SDKMessageProcessingStep(service, new ColumnSet(true)));
                foreach (var sdkMessageProcessingStepImage in images)
                {
                    service.Delete(sdkMessageProcessingStepImage.LogicalName, sdkMessageProcessingStepImage.Id);
                }

                foreach (var sdkMessageProcessingStep in steps)
                {
                    service.Delete(sdkMessageProcessingStep.LogicalName, sdkMessageProcessingStep.Id);
                }
                service.Delete(matchingCrmPlugin.LogicalName, matchingCrmPlugin.Id);
            }
            var bytes = File.ReadAllBytes(localAssembly.FilePath.Replace("\"", string.Empty));
            crmAssembly.Content = Convert.ToBase64String(bytes);
            crmAssembly.Version = localAssemblyMetadata.Version;
            crmAssembly.Culture = localAssemblyMetadata.Culture;
            crmAssembly.PublicKeyToken = localAssemblyMetadata.PublicKeyToken;
            service.Update(crmAssembly);
            foreach (var additionalPlugin in result.MissingLocal)
            {
                service.Create(new PluginType
                {
                    Name = additionalPlugin.Name,
                    FriendlyName = additionalPlugin.Name,
                    PluginAssemblyId = crmAssembly.ToEntityReference(),
                    TypeName = additionalPlugin.FullName,
                    Description = additionalPlugin.FullName,
                });
            }
        }

        public List<PluginAssemblyInfo> FetchPluginAssemblies(OrganizationServiceContext context)
        {
            var pluginAssemblies = (from ass in context.CreateQuery<PluginAssembly>() where ass.IsHidden.Value == false select new { ass.Name, ass.PluginAssemblyId, ass.IsolationMode, ass.SourceType }).ToList()
                .Select(temp => new PluginAssemblyInfo(new PluginAssembly { Name = temp.Name, IsolationMode = temp.IsolationMode, SourceType = temp.SourceType, Id = temp.PluginAssemblyId ?? Guid.Empty }))
                .Where(ass => !ass.Name.StartsWith("Microsoft"));
            return pluginAssemblies.OrderBy(ass => ass.Name).ToList();
        }

        public PluginAssemblyMetadata GetAssemblyMetadata(string path)
        {
            return PluginAssemblyMetadata.FromAssembly(path);
        }

        public void DeleteAssembly(IOrganizationService service, Guid assemblyId)
        {
            var assembly = service.Retrieve(PluginAssembly.EntityLogicalName, assemblyId, new ColumnSet(false)).ToEntity<PluginAssembly>();
            var pluginTypes = assembly.GetPlug_inTypes_PluginAssembly(service, new ColumnSet(true));
            var steps = pluginTypes.SelectMany(type => type.GetSdkMessageProcessingSteps_Plug_InType(service, new ColumnSet(true))).ToList();
            var images = steps.SelectMany(step =>
                step.GetSdkMessageProcessingStepImages_SDKMessageProcessingStep(service, new ColumnSet(true))).ToList();
            foreach (var sdkMessageProcessingStepImage in images)
            {
                service.Delete(sdkMessageProcessingStepImage.LogicalName, sdkMessageProcessingStepImage.Id);
            }

            foreach (var step in steps)
            {
                service.Delete(step.LogicalName, step.Id);
            }

            foreach (var pluginType in pluginTypes)
            {
                service.Delete(pluginType.LogicalName, pluginType.Id);
            }
            service.Delete(assembly.LogicalName, assembly.Id);
        }

        private class PluginTypeComparer : IEqualityComparer<AssemblyMetadataPlugin>
        {
            public bool Equals(AssemblyMetadataPlugin x, AssemblyMetadataPlugin y)
            {
                return x?.FullName.Equals(y?.FullName) ?? false;
            }

            public int GetHashCode(AssemblyMetadataPlugin obj)
            {
                return obj.FullName.GetHashCode();
            }
        }
        public AssemblyPluginComparisonResult GetDifferenceBetweenLocalAndServerAssembly(PluginAssemblyInfo info, PluginAssembly assembly)
        {
            var serverAssembly = PluginAssemblyMetadata.FromAssembly(assembly);
            var localAssembly = PluginAssemblyMetadata.FromAssembly(info.FilePath.Replace("\"", ""));
            var matching = localAssembly.DetectedPluginTypes.Where(localType =>
                serverAssembly.DetectedPluginTypes.Any(plugin => plugin.FullName == localType.FullName)).ToList();
            var missingLocal = localAssembly.DetectedPluginTypes.Except(matching, new PluginTypeComparer()).ToList();
            var missingServer = serverAssembly.DetectedPluginTypes.Except(matching, new PluginTypeComparer()).ToList();
            return new AssemblyPluginComparisonResult
            { Matching = matching, MissingLocal = missingLocal, MissingServer = missingServer };
        }

        #endregion

        #region Plugins

        public PluginTypeInfo FetchPluginType(IOrganizationService service, Guid pluginId)
        {
            var plugin = service.RetrieveProxy<PluginType>(PluginType.EntityLogicalName, pluginId);
            if (plugin == null) throw new Exception("Plugin not found");
            return new PluginTypeInfo(plugin);
        }

        public List<PluginTypeInfo> FetchPluginTypes(IOrganizationService service, Guid pluginAssembly)
        {
            var assemblyRef = new PluginAssembly() { Id = pluginAssembly };
            var pluginTypes = assemblyRef.GetPlug_inTypes_PluginAssembly(service, new ColumnSet(true));
            return pluginTypes.OrderBy(pt => pt.Name).Select(pt => new PluginTypeInfo(pt)).ToList();
        }

        public void DeletePlugin(IOrganizationService service, Guid pluginId)
        {
            var pluginType = service.RetrieveProxy<PluginType>(PluginType.EntityLogicalName, pluginId, new ColumnSet(false));
            var steps = pluginType.GetSdkMessageProcessingSteps_Plug_InType(service, new ColumnSet(true)).ToList();
            var images = steps.SelectMany(step =>
                step.GetSdkMessageProcessingStepImages_SDKMessageProcessingStep(service, new ColumnSet(true))).ToList();
            foreach (var sdkMessageProcessingStepImage in images)
            {
                service.Delete(sdkMessageProcessingStepImage.LogicalName, sdkMessageProcessingStepImage.Id);
            }

            foreach (var step in steps)
            {
                service.Delete(step.LogicalName, step.Id);
            }

            service.Delete(pluginType.LogicalName, pluginType.Id);
        }

        #endregion

        #region Steps

        public PluginStepInfo FetchPluginStep(IOrganizationService service, Guid stepId)
        {
            var step = service.Retrieve(SdkMessageProcessingStep.EntityLogicalName, stepId, new ColumnSet(true)).ToEntity<SdkMessageProcessingStep>();
            var filter = step.SdkMessageFilterId?.RetrieveProxy<SdkMessageFilter>(service, SdkMessageFilter.Fields.PrimaryObjectTypeCode);
            EntityMetadata metadata = null;
            if (filter != null && filter.PrimaryObjectTypeCode != "none")
            {
                var request = new RetrieveMetadataChangesRequest
                {
                    Query = new EntityQueryExpression
                    {
                        Criteria = new MetadataFilterExpression(LogicalOperator.And)
                        {
                            Conditions =
                            {
                                new MetadataConditionExpression("LogicalName", MetadataConditionOperator.Equals,
                                    filter.PrimaryObjectTypeCode)
                            }
                        },
                        Properties = new MetadataPropertiesExpression("Attributes"),
                        AttributeQuery = new AttributeQueryExpression
                        {
                            Criteria = new MetadataFilterExpression(LogicalOperator.And)
                            {
                                Conditions =
                                {
                                    new MetadataConditionExpression("AttributeOf",
                                        MetadataConditionOperator.Equals, null)
                                }
                            },
                            Properties = new MetadataPropertiesExpression("LogicalName", "DisplayName")
                        }
                    }
                };
                var response = service.Execute(request) as RetrieveMetadataChangesResponse ?? throw new Exception("Unable to identify metadata");
                metadata = response.EntityMetadata.First(em => em.LogicalName == filter.PrimaryObjectTypeCode);
            }
            return new PluginStepInfo(step, filter, metadata?.Attributes ?? new AttributeMetadata[0]);
        }

        public Guid CreatePluginStep(IOrganizationService service, Guid pluginId, PluginStepInfo stepInfo)
        {
            var step = new SdkMessageProcessingStep
            {
                Name = stepInfo.Name,
                Description = stepInfo.Description,
                Rank = stepInfo.ExecutionOrder,
                ImpersonatingUserId = string.IsNullOrWhiteSpace(stepInfo.UserId)
                    ? null
                    : new EntityReference("systemuser", Guid.Parse(stepInfo.UserId)),
                Mode = stepInfo.IsAsync
                    ? SdkMessageProcessingStep_Mode.Asynchronous
                    : SdkMessageProcessingStep_Mode.Synchronous,
                SupportedDeployment = SdkMessageProcessingStep_SupportedDeployment.ServerOnly,
                FilteringAttributes = stepInfo.StepAttributes.All(attr => attr.Available)
                    ? ""
                    : string.Join(",",
                        stepInfo.StepAttributes.Where(stepAttribute => stepAttribute.Available)
                            .Select(attribute => attribute.LogicalName))
            };
            if (stepInfo.Stage != null) step.Stage = (SdkMessageProcessingStep_Stage) stepInfo.Stage;

            if (stepInfo.IsDeployedOffline && stepInfo.IsDeployedOnServer)
            {
                step.SupportedDeployment= SdkMessageProcessingStep_SupportedDeployment.Both;
            }
            else if (stepInfo.IsDeployedOffline)
            {
                step.SupportedDeployment = SdkMessageProcessingStep_SupportedDeployment.ServerOnly;
            }


            var stepMessage =
                (from message in new OrganizationServiceContext(service).CreateQuery<SdkMessage>()
                 where message.Name == stepInfo.MessageName
                 select message).FirstOrDefault() ?? throw new Exception("Message Name not found");
            step.SdkMessageId = stepMessage.ToEntityReference();
            var filterQuery = new QueryExpression(SdkMessageFilter.EntityLogicalName) { ColumnSet = new ColumnSet(false) };
            filterQuery.Criteria.AddCondition(SdkMessageFilter.Fields.SdkMessageId, ConditionOperator.Equal, stepMessage.Id);
            filterQuery.TopCount = 1;
            if (!string.IsNullOrEmpty(stepInfo.EntityName))
            {
                var metadata = service.Execute(new RetrieveEntityRequest { LogicalName = stepInfo.EntityName, EntityFilters = EntityFilters.Entity }) as RetrieveEntityResponse;
                filterQuery.Criteria.AddCondition(SdkMessageFilter.Fields.PrimaryObjectTypeCode, ConditionOperator.Equal, metadata?.EntityMetadata.ObjectTypeCode);
            }
            var filter = service.RetrieveMultiple(filterQuery).Entities?.FirstOrDefault()?.ToEntity<SdkMessageFilter>() ?? throw new Exception("Message Filter not found");
            step.SdkMessageFilterId = filter.ToEntityReference();
#pragma warning disable 612
            step.PluginTypeId = new EntityReference(PluginType.EntityLogicalName, pluginId);
#pragma warning restore 612
            return service.Create(step);
        }

        public void UpdatePluginStep(IOrganizationService orgService, Guid pluginStep, PluginStepInfo stepInfo)
        {
            var stepMessage =
                (from message in new OrganizationServiceContext(orgService).CreateQuery<SdkMessage>()
                 where message.Name == stepInfo.MessageName
                 select message).FirstOrDefault() ?? throw new Exception("Message Name not found");
            var step = orgService.RetrieveProxy<SdkMessageProcessingStep>(SdkMessageProcessingStep.EntityLogicalName, pluginStep);
            var removePreImages = stepInfo.Stage != null && (PluginStepInfo.IsAvailablePre(step.SdkMessageId.Name, step.Stage) == true &&
                                                             PluginStepInfo.IsAvailablePre(stepInfo.MessageName,
                                                                 (SdkMessageProcessingStep_Stage)stepInfo.Stage) == false);
            var removePostImages = stepInfo.Stage != null && (PluginStepInfo.IsAvailablePost(step.SdkMessageId.Name, step.Stage) == true &&
                                                              PluginStepInfo.IsAvailablePost(stepInfo.MessageName,
                                                                  (SdkMessageProcessingStep_Stage)stepInfo.Stage) == false);

            if (removePreImages || removePostImages)
            {
                var images = step.GetSdkMessageProcessingStepImages_SDKMessageProcessingStep(orgService, new ColumnSet(true));
                foreach (var image in images)
                {
                    switch (image.ImageType)
                    {
                        case SdkMessageProcessingStepImage_ImageType.Both:
                            image.ImageType = removePreImages
                                ? SdkMessageProcessingStepImage_ImageType.PostImage
                                : SdkMessageProcessingStepImage_ImageType.PreImage;
                            break;
                        case SdkMessageProcessingStepImage_ImageType.PreImage when removePreImages:
                        case SdkMessageProcessingStepImage_ImageType.PostImage when removePostImages:
                            orgService.Delete(image.LogicalName, image.Id);
                            break;
                        case null:
                            break;
                        default:
                            throw new ArgumentOutOfRangeException();
                    }
                }
            }

            step.Name = stepInfo.Name;
            step.Description = stepInfo.Description;
            if (stepInfo.Stage != null) step.Stage = (SdkMessageProcessingStep_Stage) stepInfo.Stage;
            step.Rank = stepInfo.ExecutionOrder;
            step.ImpersonatingUserId = string.IsNullOrWhiteSpace(stepInfo.UserId)
                ? null
                : new EntityReference("systemuser", Guid.Parse(stepInfo.UserId));
            step.Mode = stepInfo.IsAsync
                ? SdkMessageProcessingStep_Mode.Asynchronous
                : SdkMessageProcessingStep_Mode.Synchronous;
            step.SupportedDeployment = SdkMessageProcessingStep_SupportedDeployment.ServerOnly;
            if (stepInfo.IsDeployedOffline && stepInfo.IsDeployedOnServer)
            {
                step.SupportedDeployment = SdkMessageProcessingStep_SupportedDeployment.Both;
            }
            else if (stepInfo.IsDeployedOffline)
            {
                step.SupportedDeployment = SdkMessageProcessingStep_SupportedDeployment.ServerOnly;
            }

            step.FilteringAttributes = stepInfo.StepAttributes.All(attr => attr.Available) ? "" : string.Join(",",
                stepInfo.StepAttributes.Where(stepAttribute => stepAttribute.Available)
                    .Select(attribute => attribute.LogicalName));
            step.SdkMessageId = stepMessage.ToEntityReference();
            var filterQuery = new QueryExpression(SdkMessageFilter.EntityLogicalName) { ColumnSet = new ColumnSet(false) };
            if (!string.IsNullOrWhiteSpace(stepInfo.EntityName))
            {
                if (!(orgService.Execute(new RetrieveEntityRequest { LogicalName = stepInfo.EntityName, EntityFilters = EntityFilters.Entity }) is RetrieveEntityResponse metadata)) throw new Exception("Unable to retrieve entity");
                filterQuery.Criteria.AddCondition(SdkMessageFilter.Fields.PrimaryObjectTypeCode, ConditionOperator.Equal, metadata.EntityMetadata.ObjectTypeCode);
            }
            filterQuery.Criteria.AddCondition(SdkMessageFilter.Fields.SdkMessageId, ConditionOperator.Equal, stepMessage.Id);
            filterQuery.TopCount = 1;
            var filter = orgService.RetrieveMultiple(filterQuery).Entities?.FirstOrDefault()?.ToEntity<SdkMessageFilter>() ?? throw new Exception("Message Filter not found");
            step.SdkMessageFilterId = filter.ToEntityReference();
            orgService.Update(step);
        }

        public List<PluginStepInfo> FetchPluginSteps(IOrganizationService service, Guid plugin)
        {
            var pluginTypeRef = new PluginType { Id = plugin };
            var pluginSteps = pluginTypeRef.GetSdkMessageProcessingSteps_Plug_InType(service, new ColumnSet(true)).Select(ps => new PluginStepInfo(ps, null, null));
            return pluginSteps.OrderBy(v => v.Name).ToList();
        }

        public void DeleteStep(IOrganizationService service, Guid stepId)
        {
            var step = service.RetrieveProxy<SdkMessageProcessingStep>(SdkMessageProcessingStep.EntityLogicalName, stepId, new ColumnSet(false));
            var images = step.GetSdkMessageProcessingStepImages_SDKMessageProcessingStep(service, new ColumnSet(true)).ToList();
            foreach (var sdkMessageProcessingStepImage in images)
            {
                service.Delete(sdkMessageProcessingStepImage.LogicalName, sdkMessageProcessingStepImage.Id);
            }
            service.Delete(step.LogicalName, stepId);
        }

        public void EnablePluginStep(IOrganizationService service, Guid stepId)
        {
            var req = new SetStateRequest
            {
                EntityMoniker = new EntityReference(SdkMessageProcessingStep.EntityLogicalName, stepId),
                State = new OptionSetValue((int) SdkMessageProcessingStepState.Enabled),
                Status = new OptionSetValue((int) SdkMessageProcessingStep_StatusCode.Enabled)
            };
            service.Execute(req);
        }

        public void DisablePluginStep(IOrganizationService service, Guid stepId)
        {
            var req = new SetStateRequest
            {
                EntityMoniker = new EntityReference(SdkMessageProcessingStep.EntityLogicalName, stepId),
                State = new OptionSetValue((int) SdkMessageProcessingStepState.Disabled),
                Status = new OptionSetValue((int) SdkMessageProcessingStep_StatusCode.Disabled)
            };
            service.Execute(req);
        }

        #endregion

        #region Images

        public List<PluginStepImageInfo> FetchStepImages(IOrganizationService service, Guid step)
        {
            var stepRef = new SdkMessageProcessingStep { Id = step };
            var images = stepRef.GetSdkMessageProcessingStepImages_SDKMessageProcessingStep(service, new ColumnSet(true)).Select(img => new PluginStepImageInfo(img, null, new List<AttributeMetadata>()));
            return images.ToList();
        }

        public Guid CreatePluginStepImage(IOrganizationService orgService, Guid stepId, PluginStepImageInfo imageInfo)
        {
            var image = new SdkMessageProcessingStepImage
            {
                Name = imageInfo.Name,
                EntityAlias = imageInfo.EntityAlias,
                Attributes1 = imageInfo.ImageAttributes.All(attr => attr.Available)
                    ? ""
                    : string.Join(",",
                        imageInfo.ImageAttributes.Where(attr => attr.Available).Select(attr => attr.LogicalName))
            };
            if (imageInfo.AvailablePre && imageInfo.AvailablePost)
            {
                image.ImageType = SdkMessageProcessingStepImage_ImageType.Both;
            }
            else if (imageInfo.AvailablePre)
            {
                image.ImageType = SdkMessageProcessingStepImage_ImageType.PreImage;
            }
            else if (imageInfo.AvailablePost)
            {
                image.ImageType = SdkMessageProcessingStepImage_ImageType.PostImage;
            }

            var step = orgService.RetrieveProxy<SdkMessageProcessingStep>(SdkMessageProcessingStep.EntityLogicalName, stepId,
                SdkMessageProcessingStep.Fields.SdkMessageId);
            image.SdkMessageProcessingStepId = step.ToEntityReference();
            switch (step.SdkMessageId?.Name)
            {
                case "Create":
                    image.MessagePropertyName = "id"; break;
                case "Update": image.MessagePropertyName = "target"; break;
                case "Delete": image.MessagePropertyName = "target"; break;
            }

            return orgService.Create(image);
        }

        public void UpdatePluginStepImage(IOrganizationService orgService, Guid pluginImage, PluginStepImageInfo imageInfo)
        {
            var image = orgService.RetrieveProxy<SdkMessageProcessingStepImage>(SdkMessageProcessingStepImage.EntityLogicalName, pluginImage);
            image.Name = imageInfo.Name;
            image.EntityAlias = imageInfo.EntityAlias;
            image.Attributes1 = imageInfo.ImageAttributes.All(attr => attr.Available)
                ? ""
                : string.Join(",",
                    imageInfo.ImageAttributes.Where(attr => attr.Available).Select(attr => attr.LogicalName));
            if (imageInfo.AvailablePre && imageInfo.AvailablePost)
            {
                image.ImageType = SdkMessageProcessingStepImage_ImageType.Both;
            }
            else if (imageInfo.AvailablePre)
            {
                image.ImageType = SdkMessageProcessingStepImage_ImageType.PreImage;
            }
            else if (imageInfo.AvailablePost)
            {
                image.ImageType = SdkMessageProcessingStepImage_ImageType.PostImage;
            }
            orgService.Update(image);
        }

        public PluginStepImageInfo FetchImage(IOrganizationService service, Guid imageId)
        {
            var image = new EntityReference(SdkMessageProcessingStepImage.EntityLogicalName, imageId).RetrieveProxy<SdkMessageProcessingStepImage>(service);
            var step = image.SdkMessageProcessingStepId.RetrieveProxy<SdkMessageProcessingStep>(service,
                new ColumnSet(SdkMessageProcessingStep.Fields.SdkMessageFilterId, SdkMessageProcessingStep.Fields.SdkMessageId, SdkMessageProcessingStep.Fields.Stage));
            var filter = step.SdkMessageFilterId.RetrieveProxy<SdkMessageFilter>(service, SdkMessageFilter.Fields.PrimaryObjectTypeCode);
            var request = new RetrieveMetadataChangesRequest
            {
                Query = new EntityQueryExpression
                {
                    Criteria = new MetadataFilterExpression(LogicalOperator.And)
                    {
                        Conditions =
                        {
                            new MetadataConditionExpression("LogicalName", MetadataConditionOperator.Equals,
                                filter.PrimaryObjectTypeCode)
                        }
                    },
                    Properties = new MetadataPropertiesExpression("Attributes"),
                    AttributeQuery = new AttributeQueryExpression
                    {
                        Criteria = new MetadataFilterExpression(LogicalOperator.And)
                        {
                            Conditions =
                            {
                                new MetadataConditionExpression("AttributeOf",
                                    MetadataConditionOperator.Equals, null)
                            }
                        },
                        Properties = new MetadataPropertiesExpression("LogicalName", "DisplayName")
                    }
                }
            };
            var response = service.Execute(request) as RetrieveMetadataChangesResponse ?? throw new Exception("Unable to identify metadata");
            var metadata = response.EntityMetadata.First(em => em.LogicalName == filter.PrimaryObjectTypeCode);
            return new PluginStepImageInfo(image, step, metadata.Attributes);
        }

        public PluginStepImageInfo FetchStepImage(IOrganizationService service, Guid stepId)
        {
            var step = service.RetrieveProxy<SdkMessageProcessingStep>(SdkMessageProcessingStep.EntityLogicalName, stepId,
                new ColumnSet(SdkMessageProcessingStep.Fields.SdkMessageFilterId, SdkMessageProcessingStep.Fields.SdkMessageId, SdkMessageProcessingStep.Fields.Stage));
            var filter = step.SdkMessageFilterId.RetrieveProxy<SdkMessageFilter>(service, SdkMessageFilter.Fields.PrimaryObjectTypeCode);
            var request = new RetrieveMetadataChangesRequest
            {
                Query = new EntityQueryExpression
                {
                    Criteria = new MetadataFilterExpression(LogicalOperator.And)
                    {
                        Conditions =
                        {
                            new MetadataConditionExpression("LogicalName", MetadataConditionOperator.Equals,
                                filter.PrimaryObjectTypeCode)
                        }
                    },
                    Properties = new MetadataPropertiesExpression("Attributes"),
                    AttributeQuery = new AttributeQueryExpression
                    {
                        Criteria = new MetadataFilterExpression(LogicalOperator.And)
                        {
                            Conditions =
                            {
                                new MetadataConditionExpression("AttributeOf",
                                    MetadataConditionOperator.Equals, null)
                            }
                        },
                        Properties = new MetadataPropertiesExpression("LogicalName", "DisplayName")
                    }
                }
            };
            var response = service.Execute(request) as RetrieveMetadataChangesResponse ?? throw new Exception("Unable to identify metadata");
            var metadata = response.EntityMetadata.First(em => em.LogicalName == filter.PrimaryObjectTypeCode);
            return new PluginStepImageInfo(null, step, metadata.Attributes);
        }

        public void DeleteImage(IOrganizationService service, Guid imageId)
        {
            service.Delete(SdkMessageProcessingStepImage.EntityLogicalName, imageId);
        }

        #endregion

        public PluginStepInfoAttribute[] GetAvailableAttributes(IOrganizationService service, string entity)
        {
            var request = new RetrieveMetadataChangesRequest
            {
                Query = new EntityQueryExpression
                {
                    Criteria = new MetadataFilterExpression(LogicalOperator.And)
                    {
                        Conditions =
                        {
                            new MetadataConditionExpression("LogicalName", MetadataConditionOperator.Equals,
                                entity)
                        }
                    },
                    Properties = new MetadataPropertiesExpression("Attributes"),
                    AttributeQuery = new AttributeQueryExpression
                    {
                        Criteria = new MetadataFilterExpression(LogicalOperator.And)
                        {
                            Conditions =
                            {
                                new MetadataConditionExpression("AttributeOf",
                                    MetadataConditionOperator.Equals, null)
                            }
                        },
                        Properties = new MetadataPropertiesExpression("LogicalName", "DisplayName")
                    }
                }
            };
            var response = service.Execute(request) as RetrieveMetadataChangesResponse;
            return response?.EntityMetadata[0].Attributes.Select(metadata => new PluginStepInfoAttribute
            {
                Available = true,
                LogicalName = metadata.LogicalName,
                DisplayName = metadata.DisplayName.UserLocalizedLabel.Label
            }).OrderBy(attribute => attribute.DisplayName).ToArray();
        }
    }

    [JsonObject(MemberSerialization.OptOut)]
    public class AssemblyPluginComparisonResult
    {
        public AssemblyPluginComparisonResult()
        {
            Matching = new List<AssemblyMetadataPlugin>();
            MissingLocal = new List<AssemblyMetadataPlugin>();
            MissingServer = new List<AssemblyMetadataPlugin>();
        }

        public List<AssemblyMetadataPlugin> Matching { get; set; }
        public List<AssemblyMetadataPlugin> MissingLocal { get; set; }
        public List<AssemblyMetadataPlugin> MissingServer { get; set; }
    }
}
