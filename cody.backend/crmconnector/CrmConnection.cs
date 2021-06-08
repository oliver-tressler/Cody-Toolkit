using System;
using System.IO;
using System.ServiceModel.Description;
using System.Xml.XPath;
using Microsoft.Xrm.Sdk.Client;
using Microsoft.Xrm.Sdk.Discovery;

namespace crmconnector
{
    /**
     * A connection to an instance. Allows creating pre-authenticated discovery and organization services via username and password.
     */
    public class CrmConnection
    {
        public DiscoveryServiceProxy DiscoveryService { get; }
        public string DiscoveryServiceUrl { get; }

        public CrmConnection(ICrmConnectionAuthenticationDetailsProvider authenticationDetailsProvider)
        {
            DiscoveryServiceUrl = authenticationDetailsProvider.AcquireDiscoveryServiceUrl();
            DiscoveryService = CreateDiscoveryServiceProxy(authenticationDetailsProvider);
        }

        public static DiscoveryServiceProxy CreateDiscoveryServiceProxy(ICrmConnectionAuthenticationDetailsProvider authenticationDetailsProvider)
        {
            var clientCredentials = new ClientCredentials();
            clientCredentials.UserName.UserName = authenticationDetailsProvider.AcquireUsername();
            clientCredentials.UserName.Password = authenticationDetailsProvider.AcquirePassword();
            var disco = new DiscoveryServiceProxy(new Uri(authenticationDetailsProvider.AcquireDiscoveryServiceUrl()), null, clientCredentials, null);
            try
            {
                disco.Authenticate();
            }
            catch (Exception e)
            {
                throw new Exception("Discovery service was unable to authenticate.", e);
            }
            return disco;
        }

        public OrganizationServiceProxy CreateOrganizationServiceProxy(ICrmConnectionAuthenticationDetailsProvider authenticationDetailsProvider, string organization)
        {
            var credentials = new ClientCredentials();
            credentials.UserName.UserName = authenticationDetailsProvider.AcquireUsername();
            credentials.UserName.Password = authenticationDetailsProvider.AcquirePassword();
            if (!(DiscoveryService.Execute(new RetrieveOrganizationRequest {UniqueName = organization}) is
                RetrieveOrganizationResponse response)) throw new Exception("Cannot retrieve organization details");
            var organizationService = new OrganizationServiceProxy(new Uri(response.Detail.Endpoints[EndpointType.OrganizationService]), null,
                credentials, null);
            organizationService.EnableProxyTypes();
            organizationService.Authenticate();
            return organizationService;
        }
    }

    public static class ServiceExtensions
    {
        public static bool IsAuthenticated(this OrganizationServiceProxy proxy)
        {
            return proxy.IsAuthenticated && proxy.SecurityTokenResponse.Response.Lifetime.Expires > DateTime.Now.Subtract(new TimeSpan(0, 2, 30));
        }

        public static bool IsAuthenticated(this DiscoveryServiceProxy proxy)
        {
            return proxy.IsAuthenticated && proxy.SecurityTokenResponse.Response.Lifetime.Expires > DateTime.Now.Subtract(new TimeSpan(0, 2, 30));
        }
    }

    public interface ICrmConnectionAuthenticationDetailsProvider
    {
        string AcquirePassword();
        string AcquireUsername();
        string AcquireDiscoveryServiceUrl();
    }

    public class CrmConnectionCredentialsFileBasedAuthenticationDetailsProvider : ICrmConnectionAuthenticationDetailsProvider
    {
        private readonly string _password;
        private readonly string _username;
        private readonly string _discoveryServiceUrl;
        public CrmConnectionCredentialsFileBasedAuthenticationDetailsProvider(Stream stream)
        {
            var xml = new XPathDocument(stream);
            var xmlNavigator = xml.CreateNavigator();
            _password = xmlNavigator.SelectSingleNode("/AuthenticationDetails/Credentials/Password")?.Value;
            _username = xmlNavigator.SelectSingleNode("/AuthenticationDetails/Credentials/UserName")?.Value;
            _discoveryServiceUrl = xmlNavigator.SelectSingleNode("/AuthenticationDetails/DiscoveryServiceUrl")?.Value;
            if (string.IsNullOrEmpty(_username) || string.IsNullOrEmpty(_password))
                throw new Exception(
                    "Username or Password not specified in the credentials file. Please use the UserName (/AuthenticationDetails/Credentials/Username) and Password (/AuthenticationDetails/Credentials/Password) elements .");
            if (string.IsNullOrWhiteSpace(_discoveryServiceUrl)) throw new Exception("Discovery Service URL not specified in the credentials file. Please use the (/AuthenticationDetails/DiscoveryServiceUrl) element.");
            if (!IsValidUrl(_discoveryServiceUrl))
            {
                throw new Exception("Discovery Service URL is not a valid URL");
            }
        }

        private static bool IsValidUrl(string url)
        {
            return Uri.IsWellFormedUriString(url, UriKind.Absolute) &&
                   Uri.TryCreate(url, UriKind.Absolute, out var uri) &&
                   (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
        }

        public string AcquirePassword()
        {
            return _password;
        }

        public string AcquireUsername()
        {
            return _username;
        }

        public string AcquireDiscoveryServiceUrl()
        {
            return _discoveryServiceUrl;
        }
    }
    
    public class CrmConnectionDefaultAuthenticationDetailsProvider : ICrmConnectionAuthenticationDetailsProvider
    {
        private readonly string _password;
        private readonly string _userName;
        private readonly string _discoveryServiceUrl;
        public CrmConnectionDefaultAuthenticationDetailsProvider(string userName, string password, string discoveryServiceUrl)
        {
            _password = password;
            _userName = userName;
            _discoveryServiceUrl = discoveryServiceUrl;
        }
        public string AcquirePassword()
        {
            return _password;
        }

        public string AcquireUsername()
        {
            return _userName;
        }

        public string AcquireDiscoveryServiceUrl()
        {
            return _discoveryServiceUrl;
        }
    }
}
