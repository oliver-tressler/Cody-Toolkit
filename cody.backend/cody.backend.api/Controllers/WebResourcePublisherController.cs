using System.IO;
using System.Web.Http;
using cody.backend.api.Cache;
using crmconnector;
using webresourcepublish;

// ReSharper disable UnusedAutoPropertyAccessor.Global

namespace cody.backend.api.Controllers
{
    public class WebResourcePublisherController : ApiController
    {
        [HttpPost]
        [Route("api/WebResourcePublisher/{organization}/updateWebResource")]
        public IHttpActionResult Publish([FromUri]string organization, [FromBody]WebResourceRequestData data)
        {
            if (!data.IsValid()) return BadRequest("Invalid data");
            if (!File.Exists(data.Path))
            {
                throw new FileNotFoundException(data.Path);
            }

            var content = File.ReadAllBytes(data.Path);
            var ext = Path.GetExtension(data.Path);
            var publisher = new WebResourcePublisher(new WebResourceConfiguration(data.Name, data.DisplayName, content, ext));
            publisher.UpdateWebResource(ConnectionCache.Instance.Value.GetOrganizationService(organization));
            return Ok();
        }

        public class WebResourceRequestData
        {
            public string Path { get; set; }
            public string Name { get; set; }
            public string DisplayName { get; set; }

            public bool IsValid() => !(Path==null || DisplayName == null || Name == null);
        }
    }
}