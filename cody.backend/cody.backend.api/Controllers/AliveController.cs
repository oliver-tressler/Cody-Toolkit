using System.Web.Http;

namespace cody.backend.api.Controllers
{
    public class AliveController : ApiController
    {
        /**
         * Mostly for debugging purposes to see how the extension handles a closing side process.
         */
        [HttpPost]
        public IHttpActionResult Shutdown()
        {
            return Ok(Launcher.ShutDown.Set());
        }

        /**
         * Basic check to see if Web API is responsive.
         */
        [HttpGet]
        public IHttpActionResult Alive()
        {
            return Ok();
        }
    }
}