using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using PluginType = utils.proxies.PluginType;

namespace solutionmanagement.Model
{
    [JsonObject(MemberSerialization.OptIn)]
    public class PluginTypeInfo
    {
        public PluginTypeInfo(PluginType type)
        {
            Plugin = type;
            Name = type.Name;
            Id = type.Id;
        }

        [JsonProperty]
        public string Name { get; set; }
        [JsonProperty]
        public Guid Id { get; set; }
        public Dictionary<Guid, PluginStepInfo> PluginSteps { get; set; }
        public PluginType Plugin { get; set; }
    }
}