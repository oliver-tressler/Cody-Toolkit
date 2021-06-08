using System.Collections.Generic;
using System.Linq;
using proxygenerator.Data.Model.OptionSets;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.OptionSets
{
    public class ExternalOptionSetGenerator : InternalOptionSetGenerator
    {
        public ExternalOptionSetGenerator(OptionSetData optionSetData) : base(optionSetData)
        {
            Model = new
            {
                enumName = optionSetData.EnumName
            };
        }

        public override object Model { get; }
    }
}