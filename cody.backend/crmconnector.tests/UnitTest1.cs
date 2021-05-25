using System.Net;
using NUnit.Framework;

namespace crmconnector.tests
{
    public class Tests
    {
        [SetUp]
        public void Setup()
        {
        }

        [Test]
        public void Test1()
        {
            
            var auth = new CrmConnectionDefaultAuthenticationDetailsProvider("ximea-group\\oliver.tressler", "l0k@dmin@050",
                "https://dev.ximea-group.com/XRMServices/2011/Discovery.svc");
            CrmConnection.CreateDiscoveryServiceProxy(auth);
        }
    }
}