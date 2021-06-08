using System;
using System.Collections.Concurrent;
using Microsoft.Xrm.Sdk.Client;

namespace crmconnector
{
    public class AuthorizedOrganizationCreatedResponse
    {
        public DateTime? Expires { get; set; }
        public bool Success { get; set; }
    }
    /**
     * Singleton threadsafe cache for discovery service proxy and organization service proxies. Allows quick switching between
     * organizations and more convenient organization service reuse.
     */
    public class ConnectionCache
    {
        public static readonly Lazy<ConnectionCache> Instance = new Lazy<ConnectionCache>(() => new ConnectionCache());
        private readonly ConcurrentDictionary<string, OrganizationServiceProxy> _cache;
        private string _discoveryServiceUrl;
        private string _userName;
        private CrmConnection _connection;
        public ConnectionCache()
        {
            _cache = new ConcurrentDictionary<string, OrganizationServiceProxy>();
            _discoveryServiceUrl = "";
            _userName = "";
        }

        /**
         * Create a throwaway discovery service if an authenticated one does not exist.
         * The throwaway discovery service might be cached if the discovery url and username match.
         */
        public DiscoveryServiceProxy GetTemporarayDiscoveryServiceProxy(ICrmConnectionAuthenticationDetailsProvider authenticationDetailsProvider)
        {
            var temporaryDiscoveryServiceUrl = authenticationDetailsProvider.AcquireDiscoveryServiceUrl();
            var temporaryUserName = authenticationDetailsProvider.AcquireUsername();
            if (_connection == null)
            {
                _discoveryServiceUrl = temporaryDiscoveryServiceUrl;
                _userName = temporaryUserName;
                _connection = new CrmConnection(authenticationDetailsProvider);
            }

            return _discoveryServiceUrl != temporaryDiscoveryServiceUrl || _userName != temporaryUserName
                ? CrmConnection.CreateDiscoveryServiceProxy(authenticationDetailsProvider)
                : _connection.DiscoveryService;
        }

        public OrganizationServiceProxy GetOrganizationService(string organizationName)
        {
            if (!_cache.TryGetValue(organizationName, out var organizationService))
                throw new Exception("Please establish a connection first.");
            if (organizationService.IsAuthenticated()) return organizationService;
            _cache.TryRemove(organizationName, out _);
            throw new Exception("The OrganizationServiceProxy expired. Please login again.");
        }

        public AuthorizedOrganizationCreatedResponse AddAuthorizedOrganization(string organizationName, ICrmConnectionAuthenticationDetailsProvider authenticationDetailsProvider)
        {
            var discoveryServiceUrl = authenticationDetailsProvider.AcquireDiscoveryServiceUrl();
            var userName = authenticationDetailsProvider.AcquireUsername();
            
            if (discoveryServiceUrl != _discoveryServiceUrl || userName != _userName)
            {
                _cache.Clear();
                _discoveryServiceUrl = discoveryServiceUrl;
                _userName = userName;
                _connection = new CrmConnection(authenticationDetailsProvider);
            }
            else if (!_connection.DiscoveryService.IsAuthenticated())
            {
                // Auto refresh discovery service if it expires
                _connection = new CrmConnection(authenticationDetailsProvider);
            }
            var proxy = _connection.CreateOrganizationServiceProxy(authenticationDetailsProvider, organizationName);
            _cache[organizationName] = proxy;
            return new AuthorizedOrganizationCreatedResponse
                {Expires = proxy.SecurityTokenResponse.Response.Lifetime.Expires, Success = true};
        }
    }
}