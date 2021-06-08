using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using AppDomainToolkit;
using Microsoft.Xrm.Sdk;
using Newtonsoft.Json;
using utils.proxies;
using PluginAssembly = utils.proxies.PluginAssembly;

namespace pluginregistration.Model
{
    [JsonObject(MemberSerialization.OptIn)]
    public class PluginAssemblyInfo
    {
        public PluginAssemblyInfo()
        {
            PluginTypes = new List<PluginTypeInfo>();
        }

        public PluginAssemblyInfo(PluginAssembly pluginAssembly)
        {
            PluginAssembly = pluginAssembly;
            Name = pluginAssembly.Name;
            Id = pluginAssembly.Id;
            PluginTypes = new List<PluginTypeInfo>();
            IsSandboxed = pluginAssembly.IsolationMode == PluginAssembly_IsolationMode.Sandbox;
            DeploymentMode = (int?)pluginAssembly.SourceType ?? -1;
            if (pluginAssembly.Content != null)
                Metadata = PluginAssemblyMetadata.FromAssembly(pluginAssembly);
        }

        public PluginTypeInfo this[Guid id] => PluginTypes.FirstOrDefault(info => info.Id.Equals(id));

        [JsonProperty]
        public Guid Id { get; set; }
        [JsonProperty]
        public string Name { get; set; }
        [JsonProperty]
        public string FilePath { get; set; }
        [JsonProperty] public bool IsSandboxed { get; set; }
        [JsonProperty] public bool IsWatched { get; set; }
        [JsonProperty] public int DeploymentMode { get; set; }
        [JsonProperty] public PluginAssemblyMetadata Metadata { get; set; }
        public List<PluginTypeInfo> PluginTypes { get; set; }
        public PluginAssembly PluginAssembly { get; }
    }

    [JsonObject(MemberSerialization.OptOut)]
    public class PluginAssemblyMetadata : MarshalByRefObject
    {
        public string AssemblyName { get; set; }
        public string Version { get; set; }
        public string Culture { get; set; }
        public string PublicKeyToken { get; set; }
        public AssemblyMetadataPlugin[] DetectedPluginTypes { get; set; }
        
        public static PluginAssemblyMetadata FromAssembly(string path)
        {
            PluginAssemblyMetadata metadata;
            var settings = new AppDomainSetup
            {
                ApplicationBase = AppDomain.CurrentDomain.SetupInformation.ApplicationBase,
                PrivateBinPath = AppDomain.CurrentDomain.SetupInformation.PrivateBinPath,
                ApplicationName = "AssemblyAnalysisContext",
            };
            using (var throwAwayAppDomain = AppDomainContext.Create(settings))
            {
                var tempMetadata = RemoteFunc.Invoke(throwAwayAppDomain.Domain, path, (assemblyFilePath) =>
                {
                    AppDomain.CurrentDomain.ReflectionOnlyAssemblyResolve +=
                        (_, args) => Assembly.ReflectionOnlyLoad(args.Name);
                    var assembly = Assembly.ReflectionOnlyLoad(File.ReadAllBytes(assemblyFilePath));
                    return new AssemblyAnalyzer().AnalyzeAssembly(assembly);
                });
                // Copy tempMetadata, to allow usage after appdomain disposal
                metadata = new PluginAssemblyMetadata
                {
                    AssemblyName = tempMetadata.AssemblyName,
                    Culture = tempMetadata.Culture,
                    PublicKeyToken = tempMetadata.PublicKeyToken,
                    Version = tempMetadata.Version,
                    DetectedPluginTypes = tempMetadata.DetectedPluginTypes.Select(plugin =>
                        new AssemblyMetadataPlugin {FullName = plugin.FullName, Name = plugin.Name}).ToArray(),
                };
            }

            return metadata;
        }

        public static PluginAssemblyMetadata FromAssembly(PluginAssembly plugInAssembly)
        {
            PluginAssemblyMetadata metadata;
            var settings = new AppDomainSetup
            {
                ApplicationBase = AppDomain.CurrentDomain.SetupInformation.ApplicationBase,
                PrivateBinPath = AppDomain.CurrentDomain.SetupInformation.PrivateBinPath,
                ApplicationName = "AssemblyAnalysisContext",
            };
            using (var throwAwayAppDomain = AppDomainContext.Create(settings))
            {
                var tempMetadata = RemoteFunc.Invoke(throwAwayAppDomain.Domain, plugInAssembly.Content, (content) =>
                {
                    AppDomain.CurrentDomain.ReflectionOnlyAssemblyResolve +=
                        (_, args) => Assembly.ReflectionOnlyLoad(args.Name);
                    var assembly = Assembly.ReflectionOnlyLoad(Convert.FromBase64String(content));
                    return new AssemblyAnalyzer().AnalyzeAssembly(assembly);
                });
                // Copy tempMetadata, to allow usage after appdomain disposal
                metadata = new PluginAssemblyMetadata
                {
                    AssemblyName = tempMetadata.AssemblyName,
                    Culture = tempMetadata.Culture,
                    PublicKeyToken = tempMetadata.PublicKeyToken,
                    Version = tempMetadata.Version,
                    DetectedPluginTypes = tempMetadata.DetectedPluginTypes.Select(plugin =>
                        new AssemblyMetadataPlugin {FullName = plugin.FullName, Name = plugin.Name}).ToArray(),
                };
            }

            return metadata;
        }
    }

    [JsonObject(MemberSerialization.OptOut)]
    public class AssemblyMetadataPlugin : MarshalByRefObject
    {
        public string Name { get; set; }
        public string FullName { get; set; }
    }

    public class AssemblyAnalyzer : MarshalByRefObject
    {
        public PluginAssemblyMetadata AnalyzeAssembly(Assembly assembly)
        {
            var assemblyMetadata = assembly.GetName().FullName.Split(",= ".ToCharArray(), StringSplitOptions.RemoveEmptyEntries);
            var detectedPlugins = assembly.ExportedTypes.Where(type =>
                !type.IsAbstract && !type.IsInterface && type.IsPublic && type.GetInterfaces()
                    .Any(interfaceType => interfaceType.FullName == typeof(IPlugin).FullName));
            return new PluginAssemblyMetadata
            {
                AssemblyName = assemblyMetadata[0],
                Version = assemblyMetadata[2],
                Culture = assemblyMetadata[4],
                PublicKeyToken = assemblyMetadata[6],
                DetectedPluginTypes = detectedPlugins.Select(type => new AssemblyMetadataPlugin{Name = type.Name, FullName = type.FullName}).ToArray()
            };
        }
    }
}