using System;
using System.Net.Http;
using System.Reflection;
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

            [Option('p', "port", Default = 8080, HelpText = "Specifies on which port to listen for API requests")]
            public int Port { get; set; }
        }

        public static void Main(string[] args)
        {
            AppDomain.CurrentDomain.ReflectionOnlyAssemblyResolve +=
                (sender, eventArgs) => Assembly.ReflectionOnlyLoad(eventArgs.Name);

            Parser.Default.ParseArguments<Options>(args).WithParsed(options =>
            {
                var config = new HttpSelfHostConfiguration("http://localhost:" + options.Port);
                config.MapHttpAttributeRoutes();
                config.Routes.MapHttpRoute("API Default", "api/{controller}/{action}");

                using (var host = new HttpSelfHostServer(config))
                {
                    // ReSharper disable once AsyncConverter.AsyncWait
                    host.OpenAsync().Wait();
                    Console.WriteLine(options.BootIdentifier);
                    ShutDown.WaitOne();
                }
            });
        }
    }
}