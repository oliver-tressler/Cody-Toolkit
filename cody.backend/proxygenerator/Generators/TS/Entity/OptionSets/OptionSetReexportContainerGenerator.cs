using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.OptionSets
{
    public class OptionSetReexportContainerGenerator : CodeGenerator
    {
        public OptionSetReexportContainerGenerator()
        {
            IndentChildren = false;
        }
        public override object Model { get; }
    }
}