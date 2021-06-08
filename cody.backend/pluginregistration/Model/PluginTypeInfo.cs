using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using PluginType = utils.proxies.PluginType;

namespace pluginregistration.Model
{
    [JsonObject(MemberSerialization.OptIn)]
    public class PluginTypeInfo
    {
        public PluginTypeInfo(PluginType type)
        {
            Plugin = type;
            PluginSteps = new Dictionary<Guid, PluginStepInfo>();
            Name = type.Name;
            Id = type.Id;
        }

        public PluginStepInfo this[Guid id] => PluginSteps.ContainsKey(id) ? PluginSteps[id] : null;

        [JsonProperty]
        public string Name { get; set; }
        [JsonProperty]
        public Guid Id { get; set; }
        public Dictionary<Guid, PluginStepInfo> PluginSteps { get; set; }
        public PluginType Plugin { get; set; }
    }
}