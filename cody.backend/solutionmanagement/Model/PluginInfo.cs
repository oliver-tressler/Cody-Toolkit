using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace solutionmanagement.Model
{
    [JsonObject]
    public class PluginInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public List<StepInfo> Steps { get; set; }
    }
}