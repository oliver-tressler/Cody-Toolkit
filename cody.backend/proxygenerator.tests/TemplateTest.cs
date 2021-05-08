using System;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using crmconnector;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using proxygenerator.Generators;
using proxygenerator.Generators.Contract;
using proxygenerator.Generators.TS;
using proxygenerator.Utils;

namespace proxygenerator.tests
{
    [TestClass]
    public class TemplateTest
    {
        [DataRow("salesorder", "systemuser")]
        [DataTestMethod]
        public void GenerateProxies(params string[] proxies)
        {
            var authDetailsProvider = new CrmConnectionDefaultAuthenticationDetailsProvider(
                "definitelynotmyusername", "definitelynotmypassword",
                "https://dev.ximea-group.com/XRMServices/2011/Discovery.svc");
            var proxy = new CrmConnection(authDetailsProvider).CreateOrganizationServiceProxy(authDetailsProvider,
                "XIMEADEV");
            var stopwatch = Stopwatch.StartNew();
            ProxyBootstrap.InitEntityProxyGeneration(new EntityProxyGenerationOptions
            {
                Path = "C:\\Users\\olive\\source\\repos\\XIMEA\\Client.Limax\\limax-spa\\src\\WebApi\\Proxies",
                GlobalEnums = true,
                EntityLogicalNames = proxies
            }, "ts", proxy);
            stopwatch.Stop();
            Console.WriteLine(stopwatch.Elapsed);
        }
        
        [DataRow("new_cody_target", "xim_limax_command")]
        [DataTestMethod]
        public void GenerateActions(params string[] proxies)
        {
            var authDetailsProvider = new CrmConnectionDefaultAuthenticationDetailsProvider(
                "definitelynotmyusername", "definitelynotmypassword",
                "https://dev.ximea-group.com/XRMServices/2011/Discovery.svc");
            var proxy = new CrmConnection(authDetailsProvider).CreateOrganizationServiceProxy(authDetailsProvider,
                "XIMEADEV");
            var stopwatch = Stopwatch.StartNew();
            ProxyBootstrap.InitActionProxyGeneration(new ActionProxyGenerationOptions
            {
                Path = "C:\\Users\\olive\\source\\repos\\XIMEA\\Client.Limax\\limax-spa\\src\\WebApi\\Proxies",
                ActionNames = proxies
            }, "ts", proxy);
            stopwatch.Stop();
            Console.WriteLine(stopwatch.Elapsed);
        }

        [TestMethod]
        public void GetScribanFiles()
        {
            var assembly = Assembly.GetAssembly(typeof(TemplateLoader));
            var scribanTemplates = assembly.GetManifestResourceNames().Where(name => name.EndsWith(".scriban-txt"));
            Console.WriteLine(string.Join(Environment.NewLine, scribanTemplates));
        }

        [TestMethod]
        public void TestLongCommentBody()
        {
            var comment = new Comment("This is a rather long description that should be cut into multiple lines.\r\n This is a rather long description that should be cut into multiple lines. This is a rather long description that should be cut into multiple lines.");
            Console.WriteLine(new CommentGenerator(comment).Generate());
        }
    }
}