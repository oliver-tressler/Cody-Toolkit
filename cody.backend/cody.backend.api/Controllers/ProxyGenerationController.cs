using System.Linq;
using System.Web.Http;
using crmconnector;
using proxygenerator;
using proxygenerator.Data;

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
            return Ok(ProxyBootstrap.InitEntityProxyGeneration(options, language, organizationService));
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
            return Ok(ProxyBootstrap.InitActionProxyGeneration(options, language, organizationService));
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