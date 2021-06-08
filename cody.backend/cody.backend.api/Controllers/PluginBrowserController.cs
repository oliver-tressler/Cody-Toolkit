using System;
using System.IO;
using System.Linq;
using System.Web.Http;
using cody.backend.api.Cache;
using crmconnector;
using Microsoft.Xrm.Sdk.Client;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata.Query;
using Microsoft.Xrm.Sdk.Query;
using pluginregistration;
using pluginregistration.Model;
using PluginAssembly = utils.proxies.PluginAssembly;
using SdkMessage = utils.proxies.SdkMessage;

namespace cody.backend.api.Controllers
{
    public class PluginBrowserController : ApiController
    {
        #region Children

        [HttpGet]
        [Route("api/PluginBrowser/assemblies/{organization}")]
        public IHttpActionResult Assemblies(string organization)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var infos = new PluginBrowser().FetchPluginAssemblies(new OrganizationServiceContext(conn));
            foreach (var info in infos)
            {
                info.IsWatched = AssemblyWatcherCache.GetInstance(organization).Watchers.ContainsKey(info.Id);
            }
            return Json(infos);
        }

        [HttpGet]
        [Route("api/PluginBrowser/plugins/{organization}/{assemblyId}")]
        public IHttpActionResult Plugins(string organization, string assemblyId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var infos = new PluginBrowser().FetchPluginTypes(conn, Guid.Parse(assemblyId));
            return Json(infos);
        }

        [HttpGet]
        [Route("api/PluginBrowser/steps/{organization}/{pluginId}")]
        public IHttpActionResult Steps(string organization, string pluginId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var infos = new PluginBrowser().FetchPluginSteps(conn, Guid.Parse(pluginId));

            return Json(infos);
        }

        [HttpGet]
        [Route("api/PluginBrowser/images/{organization}/{stepId}")]
        public IHttpActionResult Images(string organization, string stepId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var infos = new PluginBrowser().FetchStepImages(conn, Guid.Parse(stepId));
            return Json(infos);
        }

        #endregion

        #region Details

        #region Assembly

        [HttpGet]
        [Route("api/PluginBrowser/assembly/{organization}/{assemblyId}")]
        public IHttpActionResult Assembly(string organization, string assemblyId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var info = new PluginBrowser().FetchPluginAssembly(conn, Guid.Parse(assemblyId));
            info.IsWatched = AssemblyWatcherCache.GetInstance(organization).Watchers.ContainsKey(info.Id);
            return Json(info);
        }
        
        [HttpPost]
        [Route("api/PluginBrowser/assembly/{organization}/{assemblyId}")]
        public IHttpActionResult UpdateAssembly([FromUri]string organization, [FromUri]string assemblyId, [FromBody]PluginAssemblyInfo assembly)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var crmAssembly = new PluginBrowser().UpdatePluginAssembly(conn, Guid.Parse(assemblyId), assembly);
            return Ok(new {Id = assemblyId, AssemblyName = crmAssembly.Name});
        }

        [HttpPost]
        [Route("api/PluginBrowser/assembly/{organization}/{assemblyId}/delete")]
        public IHttpActionResult DeleteAssembly([FromUri]string organization, [FromUri]string assemblyId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            new PluginBrowser().DeleteAssembly(conn, Guid.Parse(assemblyId));
            return Ok();
        }

        [HttpPost]
        [Route("api/PluginBrowser/assembly/{organization}/new")]
        public IHttpActionResult CreateAssembly([FromUri]string organization, [FromBody]PluginAssemblyInfo assembly)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var newId = new PluginBrowser().CreatePluginAssembly(conn, assembly);
            return Ok(new {Id = newId.ToString(), assembly.Metadata.AssemblyName});
        }

        [HttpPost]
        [Route("api/PluginBrowser/assembly/{organization}/{assemblyId}/watch/{autoDelete}")]
        public IHttpActionResult WatchAssembly([FromUri] string organization, [FromUri]string assemblyId, [FromUri]bool autoDelete, [FromBody] PluginAssemblyInfo assembly)
        {
            assembly.FilePath = assembly.FilePath?.Replace("\"", "");
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            if (string.IsNullOrWhiteSpace(assembly.FilePath))
                return InternalServerError(new FileNotFoundException("File Path cannot be null"));
            if (!File.Exists(assembly.FilePath))
                return InternalServerError(new FileNotFoundException("File not found"));
            var cache = AssemblyWatcherCache.GetInstance(organization);
            if (cache.Watchers.ContainsKey(Guid.Parse(assemblyId))) return Ok();
            var fsw = new PluginBrowser().WatchPluginAssembly(conn, Guid.Parse(assemblyId),
                assembly, autoDelete);
            fsw.Renamed += (sender, args) =>
            {
                fsw.Dispose();
            };
            fsw.Disposed += (sender, args) =>
            {
                cache.Watchers.TryRemove(Guid.Parse(assemblyId), out _);
            };
            cache.Watchers.AddOrUpdate(Guid.Parse(assemblyId), fsw, (guid, watcher) => fsw);
            return Ok();
        }

        [HttpPost]
        [Route("api/PluginBrowser/assembly/{organization}/{assemblyId}/unwatch")]
        public IHttpActionResult UnwatchAssembly([FromUri] string organization, [FromUri] string assemblyId)
        {
            var id = Guid.Parse(assemblyId);
            var watchers = AssemblyWatcherCache.GetInstance(organization).Watchers;
            var fsw = watchers[id];
            fsw.Dispose();
            watchers.TryRemove(id, out _);
            return Ok();
        }

        #endregion

        #region Plugin
        
        [HttpGet]
        [Route("api/PluginBrowser/plugin/{organization}/{pluginId}")]
        public IHttpActionResult Plugin(string organization, string pluginId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var info = new PluginBrowser().FetchPluginType(conn, Guid.Parse(pluginId));
            return Json(info);
        }

        [HttpPost]
        [Route("api/PluginBrowser/plugin/{organization}/{pluginId}/delete")]
        public IHttpActionResult DeletePlugin(string organization, string pluginId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            new PluginBrowser().DeletePlugin(conn, Guid.Parse(pluginId));
            return Ok();
        }
        
        #endregion

        #region Step

        [HttpGet]
        [Route("api/PluginBrowser/step/{organization}/{stepId}")]
        public IHttpActionResult Step(string organization, string stepId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var info = new PluginBrowser().FetchPluginStep(conn, Guid.Parse(stepId));
            return Json(info);
        }

        [HttpPost]
        [Route("api/PluginBrowser/step/{organization}/{stepId}")]
        public IHttpActionResult UpdateStep([FromUri]string organization, [FromUri]string stepId, [FromBody]PluginStepInfo step)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            new PluginBrowser().UpdatePluginStep(conn, Guid.Parse(stepId), step);
            return Ok(new {Id = stepId, StepName = step.Name});
        }

        [HttpPost]
        [Route("api/PluginBrowser/step/{organization}/{stepId}/delete")]
        public IHttpActionResult DeleteStep([FromUri]string organization, [FromUri]string stepId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            new PluginBrowser().DeleteStep(conn, Guid.Parse(stepId));
            return Ok();
        }

        [HttpPost]
        [Route("api/PluginBrowser/step/{organization}/{pluginId}/new")]
        public IHttpActionResult CreateStep([FromUri]string organization, [FromUri]string pluginId, [FromBody]PluginStepInfo step)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var newId = new PluginBrowser().CreatePluginStep(conn, Guid.Parse(pluginId), step);
            return Ok(new {Id = newId.ToString(), StepName = step.Name});
        }

        [HttpPost]
        [Route("api/PluginBrowser/step/{organization}/{stepId}/toggleState/{state}")]
        public IHttpActionResult ToggleStepStatus([FromUri] string organization, [FromUri] string stepId, [FromUri]string state)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            if (state == "enable")
            {
                new PluginBrowser().EnablePluginStep(conn, Guid.Parse(stepId));
            } else if (state == "disable")
            {
                new PluginBrowser().DisablePluginStep(conn, Guid.Parse(stepId));
            }

            return Ok();
        }

        #endregion

        #region Image

        [HttpGet]
        [Route("api/PluginBrowser/image/{organization}/{imageid}")]
        public IHttpActionResult Image(string organization, string imageid)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var info = new PluginBrowser().FetchImage(conn, Guid.Parse(imageid));
            return Json(info);
        }

        [HttpGet]
        [Route("api/PluginBrowser/image/{organization}/{stepId}/new")]
        public IHttpActionResult ImageAbilities(string organization, string stepId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var info = new PluginBrowser().FetchStepImage(conn, Guid.Parse(stepId));
            return Json(info);
        }

        [HttpPost]
        [Route("api/PluginBrowser/image/{organization}/{stepId}/new")]
        public IHttpActionResult CreateImage([FromUri]string organization, [FromUri]string stepId, [FromBody]PluginStepImageInfo info)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var newId = new PluginBrowser().CreatePluginStepImage(conn, Guid.Parse(stepId), info);
            return Ok(new {Id = newId.ToString(), ImageName = info.Name});
        }

        [HttpPost]
        [Route("api/PluginBrowser/image/{organization}/{imageId}")]
        public IHttpActionResult UpdateImage([FromUri]string organization, [FromUri]string imageId, [FromBody]PluginStepImageInfo image)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            new PluginBrowser().UpdatePluginStepImage(conn, Guid.Parse(imageId), image);
            return Ok(new {Id = imageId, ImageName = image.Name});
        }

        [HttpPost]
        [Route("api/PluginBrowser/image/{organization}/{imageId}/delete")]
        public IHttpActionResult DeleteImage([FromUri]string organization, [FromUri]string imageId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            new PluginBrowser().DeleteImage(conn, Guid.Parse(imageId));
            return Ok();
        }

        #endregion

        #endregion

        [HttpGet]
        public IHttpActionResult AvailableEntities(string organization, string messageId = "")
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var query = new EntityQueryExpression();
            query.Criteria.Conditions.AddRange(
                new MetadataConditionExpression("IsPrivate",
                    MetadataConditionOperator.Equals, false),
                new MetadataConditionExpression("IsIntersect",
                    MetadataConditionOperator.Equals, false),
                new MetadataConditionExpression("IsBPFEntity",
                    MetadataConditionOperator.Equals, false));
            if (!string.IsNullOrWhiteSpace(messageId))
            {
                var message = conn.Retrieve(SdkMessage.EntityLogicalName, Guid.Parse(messageId),
                    new ColumnSet(false)).ToEntity<SdkMessage>();
                var filters = message.GetSdkMessageFilters_SDKMessageID(conn, new ColumnSet(true));
                if (filters.Count == 1 && filters[0].PrimaryObjectTypeCode == "none")
                {
                    return Ok(new int[0]);
                }
                if (filters.Count > 0)
                    query.Criteria.Conditions.Add(new MetadataConditionExpression("LogicalName", MetadataConditionOperator.In, filters.Select(filter => filter.PrimaryObjectTypeCode).Where(s => !string.IsNullOrWhiteSpace(s)).ToArray()));
            }
            query.Properties = new MetadataPropertiesExpression("LogicalName", "DisplayName");
            return !(conn.Execute(new RetrieveMetadataChangesRequest{Query = query}) is RetrieveMetadataChangesResponse newResponse)
                ? InternalServerError(new Exception("No response")) as IHttpActionResult
                : Ok(newResponse.EntityMetadata
                    .Select(em => new { em.LogicalName, DisplayName = em.DisplayName?.UserLocalizedLabel?.Label})
                    .OrderBy(s => s.LogicalName).ToList());
        }

        [HttpGet]
        public IHttpActionResult AvailableMessages(string organization)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var messageNames = from message in new OrganizationServiceContext(conn).CreateQuery<SdkMessage>()
                               where message.IsActive != false && message.IsPrivate != true 
                               select new { MessageId = message.SdkMessageId, MessageName = message.Name };

            return Ok(messageNames.ToList().OrderBy(s => s.MessageName).ToList());
        }

        [HttpGet]
        [Route("api/PluginBrowser/step/{organization}/{entity}/availableattributes")]
        public IHttpActionResult AvailableAttributes(string organization, string entity)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            return Ok(new PluginBrowser().GetAvailableAttributes(conn, entity));
        }

        [HttpGet]
        public IHttpActionResult AvailableUsers(string organization)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            QueryExpression userRequest = new QueryExpression("systemuser");
            userRequest.ColumnSet.AddColumn("fullname");
            return Ok(conn.RetrieveMultiple(userRequest).Entities
                .Select(entity => new {UserName = entity["fullname"], UserId = entity.Id}));
        }

        [HttpGet]
        public IHttpActionResult AssemblyMetadata(string path)
        {
            var metadata = new PluginBrowser().GetAssemblyMetadata(path.Replace("\"", ""));
            return Ok(metadata);
        }

        [HttpGet]
        public IHttpActionResult AssemblyPluginDiff(string organization, string assemblyId, string filePath)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            var id = Guid.Parse(assemblyId);
            PluginAssembly assembly = conn.Retrieve(PluginAssembly.EntityLogicalName, id, new ColumnSet(true)).ToEntity<PluginAssembly>();
            return Ok(new PluginBrowser().GetDifferenceBetweenLocalAndServerAssembly(
                new PluginAssemblyInfo {FilePath = filePath.Replace("\"", "")}, assembly));
        }
    }
}