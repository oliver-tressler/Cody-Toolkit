using System;
using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.ServiceModel;
using System.Text;
using System.Threading;
using System.Web.Http;
using System.Web.Http.SelfHost;
using CommandLine;

namespace cody.backend.api
{
    public class Launcher
    {
        public static ManualResetEvent ShutDown =
            new ManualResetEvent(false);

        class Options
        {
            [Option('i', "identifier", Default = "Booted",
                HelpText = "Writes the boot identifier to standard out to notify listeners that the server is ready.")]
            public string BootIdentifier { get; set; }
            [Option('r', "restartidentifier", Default = null,
                HelpText = "Writes the restart identifier to standard out to notify listeners that the server is ready.")]
            public string RestartIdentifier { get; set; }

            [Option('p', "port", Default = 8080, HelpText = "Specifies on which port to listen for API requests.")]
            public int Port { get; set; }
            [Option("nocertificatecheck", Default = false, HelpText = "Disables SSL Certificate check. Not recommended.")]
            public bool DoNotCheckSSLCertificates { get; set; }
        }

        public static void Main(string[] args)
        {
            AppDomain.CurrentDomain.ReflectionOnlyAssemblyResolve +=
                (sender, eventArgs) => Assembly.ReflectionOnlyLoad(eventArgs.Name);
            Parser.Default.ParseArguments<Options>(args).WithParsed(options =>
            {
                if (options.DoNotCheckSSLCertificates)
                {
                    ServicePointManager.ServerCertificateValidationCallback += 
                        (sender, cert, chain, sslPolicyErrors) => true;
                }
                try
                {
                    LaunchHost(options);
                }
                catch (AddressAccessDeniedException)
                {
                    AddUrlReservation(options.Port);
                    if (!string.IsNullOrWhiteSpace(options.RestartIdentifier))
                    {
                        Console.WriteLine(options.RestartIdentifier);
                    }
                }
            });
        }

        private static void LaunchHost(Options options)
        {
            var config = new HttpSelfHostConfiguration("http://localhost:" + options.Port);
            config.MapHttpAttributeRoutes();
            config.Routes.MapHttpRoute("API Default", "api/{controller}/{action}");
            using (var host = new HttpSelfHostServer(config))
            {
                // ReSharper disable once AsyncConverter.AsyncWait
                try
                {
                    host.OpenAsync().GetAwaiter().GetResult();
                    Console.WriteLine(options.BootIdentifier);
                    ShutDown.WaitOne();
                }
                catch (AddressAccessDeniedException)
                {
                    host.CloseAsync().GetAwaiter().GetResult();
                    host.Dispose();
                    throw;
                }
            }
        }

        public static void AddUrlReservation(int port)
        {
            string args = string.Format(@"http add urlacl url={0} user={1}\{2}", $"http://+:{port}/", Environment.UserDomainName, Environment.UserName);

            ProcessStartInfo psi = new ProcessStartInfo("netsh", args);
            psi.Verb = "runas";
            psi.CreateNoWindow = false;
            psi.WindowStyle = ProcessWindowStyle.Normal;
            psi.UseShellExecute = true;
            Process.Start(psi)?.WaitForExit();
        }
    }
}