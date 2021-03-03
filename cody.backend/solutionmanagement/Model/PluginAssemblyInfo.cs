using System;
using Newtonsoft.Json;
using PluginAssembly = utils.proxies.PluginAssembly;

namespace solutionmanagement.Model
{
    [JsonObject(MemberSerialization.OptIn)]
    public class PluginAssemblyInfo
    {
        [JsonProperty]
        public Guid? Id { get; set; }
        [JsonProperty]
        public string Name { get; set; }
    }
}