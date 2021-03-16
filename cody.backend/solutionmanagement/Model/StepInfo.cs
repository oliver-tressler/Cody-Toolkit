using System;
using Newtonsoft.Json;

namespace solutionmanagement.Model
{
    [JsonObject]
    public class StepInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string MessageName { get; set; }
        public string Stage { get; set; }
        public string EntityName { get; set; }
    }
}