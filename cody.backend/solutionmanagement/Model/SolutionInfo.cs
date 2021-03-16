using System;
using Newtonsoft.Json;

namespace solutionmanagement.Model
{
    [JsonObject]
    public class SolutionInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string UniqueName { get; set; }
        public string Version { get; set; }
        public string Description { get; set; }
        public PublisherInfo Publisher { get; set; }
    }
}