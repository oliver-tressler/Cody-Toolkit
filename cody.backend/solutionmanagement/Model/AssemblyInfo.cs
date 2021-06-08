using System;
using Newtonsoft.Json;

namespace solutionmanagement.Model
{
    [JsonObject]
    public class AssemblyInfo
    {
        public string Name { get; set; }
        public Guid? Id { get; set; }
    }
}