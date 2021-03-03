using System;
using Newtonsoft.Json;

namespace solutionmanagement
{
    [JsonObject]
    public class WebResourceInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string Description { get; set; }
        public string Type { get; set; }
    }
}