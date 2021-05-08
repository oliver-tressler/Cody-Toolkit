using proxygenerator.Data.Model.OptionSets;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.OptionSets
{
    public class OptionSetReexportGenerator : CodeGenerator
    {
        public OptionSetReexportGenerator(OptionSetData optionSetData)
        {
            Model = new
            {
                internalName = optionSetData.InternalEnumName,
                exposedName = optionSetData.ExposedEnumName
            };
        }
        public override object Model { get; }
    }
}