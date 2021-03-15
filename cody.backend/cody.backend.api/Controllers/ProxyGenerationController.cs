using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web.Http;
using crmconnector;
using Microsoft.Xrm.Sdk;
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
        [Route("api/ProxyGenerator/{organization}/{language}/generateEntityProxies")]
        public IHttpActionResult GenerateEntityProxy([FromUri] string organization, [FromUri] string language,
            [FromBody] EntityProxyGenerationOptions options)
        {
            var organizationService = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            ProxyBootstrap.InitEntityProxyGeneration(options, language, organizationService);
            return Ok();
        }

        [HttpGet]
        [Route("api/ProxyGenerator/{organization}/availableEntities")]

        public IHttpActionResult AvailableEntities(string organization)
        {
            var organizationService = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            return Ok(ProxyFetchers.AvailableEntities(organizationService).ToArray());
        }

        [HttpPost]
        [Route("api/ProxyGenerator/{organization}/{language}/generateActionProxies")]
        public IHttpActionResult GenerateActionProxy([FromUri] string organization, [FromUri] string language,
            [FromBody] ActionProxyGenerationOptions options)
        {
            var organizationService = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            ProxyBootstrap.InitActionProxyGeneration(options, language, organizationService);
            return Ok();
        }

        [HttpGet]
        [Route("api/ProxyGenerator/{organization}/availableActions")]
        public IHttpActionResult AvailableActions(string organization)
        {
            var organizationService = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            return Ok(ProxyFetchers.AvailableActions(organizationService).ToArray());
        }
    }
}