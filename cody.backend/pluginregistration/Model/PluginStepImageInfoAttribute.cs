using Newtonsoft.Json;

namespace pluginregistration.Model
{
    [JsonObject]
    public class PluginStepInfoAttribute
    {
        [JsonProperty]
        public string LogicalName { get; set; }
        [JsonProperty]
        public string DisplayName { get; set; }
        [JsonProperty]
        public bool Available { get; set; }
    }
}
