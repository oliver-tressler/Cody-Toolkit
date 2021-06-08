using System.Web.Http;

namespace cody.backend.api
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            // Web API configuration and services

            // Web API routes
            config.MapHttpAttributeRoutes();

            config.Routes.MapHttpRoute(
                name: "ProxyGeneration",
                routeTemplate: "api/{controller}/{action}");
        }
    }
}
