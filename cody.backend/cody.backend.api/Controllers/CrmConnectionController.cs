using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using crmconnector;
using Microsoft.Xrm.Sdk.Discovery;
using Newtonsoft.Json;

namespace cody.backend.api.Controllers
{
    public class CrmConnectionController : ApiController
    {
        [HttpGet]
        [Route("api/connections/{organization}")]
        public IHttpActionResult OrganizationHasAuthorizedOrganizationService(string organization)
        {
            return Ok(ConnectionCache.Instance.Value.GetOrganizationService(organization)?.IsAuthenticated());
        }

        [HttpPost]
        [Route("api/connections/establish")]
        public IHttpActionResult Connect([FromBody] EstablishConnectionToOrganizationViaUserNameAndPasswordRequest request)
        {
            return Ok(ConnectionCache.Instance.Value.AddAuthorizedOrganization(request.Organization, new CrmConnectionDefaultAuthenticationDetailsProvider(request.UserName, request.Password, request.DiscoveryServiceUrl)));
        }

        [HttpPost]
        [Route("api/connections/establish/useCredentialsFile")]
        public IHttpActionResult Connect([FromBody]EstablishConnectionToOrganizationViaCredentialsFileRequest request)
        {
            return Ok(ConnectionCache.Instance.Value.AddAuthorizedOrganization(request.Organization, new CredentialsFileManager().DecryptCredentialsFile(request.CredentialsFilePath, request.Key)));
        }

        [HttpPost]
        [Route("api/connections/available")]
        public IHttpActionResult GetAvailableOrganizationsForInstance([FromBody]EstablishConnectionToInstanceViaUserNameAndPasswordRequest request)
        {
            var disco = ConnectionCache.Instance.Value.GetTemporarayDiscoveryServiceProxy(
                new CrmConnectionDefaultAuthenticationDetailsProvider(request.UserName, request.Password,
                    request.DiscoveryServiceUrl));
            return Ok(GetOrganizationInfoFromInstance(disco));
        }

        [HttpPost]
        [Route("api/connections/available/useCredentialsFile")]
        public IHttpActionResult GetAvailableOrganizationsForInstance([FromBody]EstablishConnectionToInstanceViaCredentialsFileRequest request)
        {
            var connectionDetailsProvider = new CredentialsFileManager().DecryptCredentialsFile(request.CredentialsFilePath, request.Key);
            var disco = ConnectionCache.Instance.Value.GetTemporarayDiscoveryServiceProxy(connectionDetailsProvider);
            return Ok(GetOrganizationInfoFromInstance(disco));
        }

        /**
         * Validates if a connection can be established with a given instance configuration.
         */
        [HttpPost]
        [Route("api/connections/isValidInstanceConfiguration")]
        public IHttpActionResult IsValidInstanceConfiguration([FromBody] EstablishConnectionToInstanceViaUserNameAndPasswordRequest request)
        {
            try
            {
                ConnectionCache.Instance.Value.GetTemporarayDiscoveryServiceProxy(
                    new CrmConnectionDefaultAuthenticationDetailsProvider(request.UserName, request.Password,
                        request.DiscoveryServiceUrl));
                return Ok(true);
            }
            catch
            {
                return Ok(false);
            }
        }

        /**
         * Validates if a connection can be established with a given instance configuration.
         */
        [HttpPost]
        [Route("api/connections/isValidInstanceConfiguration/useCredentialsFile")]
        public IHttpActionResult IsValidInstanceConfiguration([FromBody] EstablishConnectionToInstanceViaCredentialsFileRequest request)
        {
            try
            {
                var configurationDetailsProvider =  new CredentialsFileManager().DecryptCredentialsFile(request.CredentialsFilePath, request.Key);
                ConnectionCache.Instance.Value.GetTemporarayDiscoveryServiceProxy(configurationDetailsProvider);
                return Ok(true);
            }
            catch
            {
                return Ok(false);
            }
        }

        [HttpPost]
        [Route("api/connections/createCredentialsFile")]
        public IHttpActionResult CreateCredentialsFile(CreateCredentialsFileRequest request)
        {
            var cfm = new CredentialsFileManager();
            cfm.CreateEncryptedFile(request.CredentialsFilePath, request.UserName, request.Password, request.DiscoveryServiceUrl, request.Key);
            return Ok();
        }
        
        private IEnumerable<OrganizationInfo> GetOrganizationInfoFromInstance(IDiscoveryService discoveryService)
        {
            var response = discoveryService.Execute(new RetrieveOrganizationsRequest());
            if (!(response is RetrieveOrganizationsResponse organizations)) throw  new Exception("Unable to find any organizations for this instance.");
            return organizations.Details.Select(org => new OrganizationInfo()
            {
                UrlName = org.UrlName,
                FriendlyName = org.FriendlyName,
                UniqueName = org.UniqueName,
                Url = org.Endpoints[EndpointType.WebApplication]
            });
        }

        [JsonObject(MemberSerialization.OptOut)]
        public class OrganizationInfo
        {
            public string UniqueName { get; set; }
            public string FriendlyName { get; set; }
            public string UrlName { get; set; }
            public string Url { get; set; }

        }

        [JsonObject(MemberSerialization.OptOut)]
        public class EstablishConnectionToOrganizationViaCredentialsFileRequest : EstablishConnectionToInstanceViaCredentialsFileRequest
        {
            public string Organization { get; set; }
        }

        [JsonObject(MemberSerialization.OptOut)]
        public class EstablishConnectionToOrganizationViaUserNameAndPasswordRequest : EstablishConnectionToInstanceViaUserNameAndPasswordRequest
        {
            public string Organization { get; set; }
        }
        
        [JsonObject(MemberSerialization.OptOut)]
        public class EstablishConnectionToInstanceViaCredentialsFileRequest
        {
            public string CredentialsFilePath { get; set; }
            public string Key { get; set; }
        }

        [JsonObject(MemberSerialization.OptOut)]
        public class EstablishConnectionToInstanceViaUserNameAndPasswordRequest
        {
            public string DiscoveryServiceUrl { get; set; }
            public string UserName { get; set; }
            public string Password { get; set; }
        }

        [JsonObject(MemberSerialization.OptOut)]
        public class CreateCredentialsFileRequest
        {
            public string DiscoveryServiceUrl { get; set; }
            public string UserName { get; set; }
            public string Password { get; set; }
            public string CredentialsFilePath { get; set; }
            public string Key { get; set; }
        }
    }
}