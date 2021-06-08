using System.Collections.Generic;

namespace proxygenerator.Generators.Contract
{
    public interface IEntityGenerator
    {
        string GenerateEntityCode();
        IEnumerable<(string FileName, string Content)> GenerateExternalOptionSets();
    }
}