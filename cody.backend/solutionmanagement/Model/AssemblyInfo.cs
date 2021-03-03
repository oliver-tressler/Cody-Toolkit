using System;
using Newtonsoft.Json;

namespace solutionmanagement
{
    [JsonObject]
    public class AssemblyInfo
    {
        public string Name { get; set; }
        public Guid? Id { get; set; }
    }
}