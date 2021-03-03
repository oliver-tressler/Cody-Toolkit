using Newtonsoft.Json;

namespace solutionmanagement.Model
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
