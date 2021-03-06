using System;
using System.Linq;
using System.Web.Http;
using crmconnector;
using Microsoft.Xrm.Sdk.Client;
using solutionmanagement;
using solutionmanagement.Model;

namespace cody.backend.api.Controllers
{
    public class SolutionManagerController : ApiController
    {
        [HttpGet]
        [Route("api/SolutionManager/{organization}/publishers")]
        public IHttpActionResult Publishers([FromUri] string organization)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            return Ok(new SolutionManager().GetPublishers(new OrganizationServiceContext(conn)).ToList());
        }

        [HttpGet]
        [Route("api/SolutionManager/{organization}/solutions")]
        public IHttpActionResult Solutions([FromUri] string organization)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            return Ok(new SolutionManager().GetSolutions(new OrganizationServiceContext(conn)).ToList());
        }

        [HttpGet]
        [Route("api/SolutionManager/{organization}/webresources")]
        public IHttpActionResult WebResources([FromUri] string organization)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            return Ok(new SolutionManager().GetWebResources(new OrganizationServiceContext(conn)).ToList());
        }

        [HttpGet]
        [Route("api/SolutionManager/{organization}/assemblies")]
        public IHttpActionResult Assemblies([FromUri] string organization)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            return Ok(new SolutionManager().GetAssemblies(new OrganizationServiceContext(conn)).ToList());
        }

        [HttpGet]
        [Route("api/SolutionManager/{organization}/assembly/{assemblyId}/steps")]
        public IHttpActionResult AssemblySteps([FromUri] string organization,
            [FromUri] string assemblyId)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            return Ok(new SolutionManager().GetAssemblySteps(conn, Guid.Parse(assemblyId)));
        }

        [HttpPost]
        [Route("api/SolutionManager/{organization}/solutions/new")]
        public IHttpActionResult CreateSolution([FromUri] string organization, [FromBody] SolutionInfo solution)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            return Ok(new SolutionManager().CreateSolution(conn, solution));
        }

        [HttpPost]
        [Route("api/SolutionManager/{organization}/assembly/{assemblyId}/addToSolution/{solutionName}")]
        public IHttpActionResult AddAssemblyToSolution([FromUri] string organization, [FromUri] string assemblyId,
            [FromUri] string solutionName)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            new SolutionManager().AddAssemblyToSolution(conn, solutionName, Guid.Parse(assemblyId));
            return Ok();
        }

        [HttpPost]
        [Route("api/SolutionManager/{organization}/step/{stepId}/addToSolution/{solutionName}")]
        public IHttpActionResult AddStepToSolution([FromUri] string organization, [FromUri] string stepId,
            [FromUri] string solutionName)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            new SolutionManager().AddStepToSolution(conn, solutionName, Guid.Parse(stepId));
            return Ok();
        }

        [HttpPost]
        [Route("api/SolutionManager/{organization}/webresource/{webresourceId}/addToSolution/{solutionName}")]
        public IHttpActionResult AddWebResourceToSolution([FromUri] string organization, [FromUri] string webresourceId,
            [FromUri] string solutionName)
        {
            var conn = ConnectionCache.Instance.Value.GetOrganizationService(organization);
            new SolutionManager().AddWebResourceToSolution(conn, solutionName, Guid.Parse(webresourceId));
            return Ok();
        }
    }
}