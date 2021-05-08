using System.Collections.Generic;
using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.OptionSets;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.OptionSets
{
    public class InternalOptionSetsContainerGenerator : CodeGenerator
    {
        public InternalOptionSetsContainerGenerator(EntityData entity)
        {
            Model = new
            {
                entityClassName = entity.ClassName
            };
            Children = entity.InternalOptionSets.Select(ios => new InternalOptionSetGenerator(ios)).Concat(
                new CodeGenerator[]
                {
                    new OptionSetReexportContainerGenerator()
                    {
                        Children = entity.ExternalOptionSets.Select(eos => new OptionSetReexportGenerator(eos))
                            .ToList<CodeGenerator>()
                    }
                }).ToList();
        }

        public override object Model { get; }
    }

    public class InternalOptionSetGenerator : CodeGenerator
    {
        public InternalOptionSetGenerator(OptionSetData optionSetData)
        {
            Model = new
            {
                enumName = optionSetData.InternalEnumName
            };
            Children =
                optionSetData.Options.SelectMany(od => new List<CodeGenerator>
                {
                    new CommentGenerator(od.Comment),
                    new OptionSetValueGenerator(od)
                }).ToList();
        }

        public override object Model { get; }
    }


    public class OptionSetValueGenerator : CodeGenerator
    {
        public OptionSetValueGenerator(OptionData optionData)
        {
            Model = new
            {
                name = optionData.OptionName,
                value = optionData.OptionValue
            };
        }

        public override object Model { get; }
    }
}