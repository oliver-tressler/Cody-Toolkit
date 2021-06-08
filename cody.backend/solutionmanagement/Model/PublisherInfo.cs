using System;
using Newtonsoft.Json;

namespace solutionmanagement.Model
{
    [JsonObject]
    public class PublisherInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string UniqueName { get; set; }
        public string Prefix { get; set; }
        public string Description { get; set; }
    }
}