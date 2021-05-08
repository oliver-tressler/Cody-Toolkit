using System.Collections.Generic;
using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS
{
    public class ImportsGenerator : CodeGenerator
    {
        public ImportsGenerator(EntityData entity)
        {
            Model = new List<object>
            {
                new
                {
                    File = "../core/BaseEntityProxy",
                    Types = new List<string>()
                    {
                        "Guid", "Attribute", "BaseEntityProxy", "LookupAttribute", "EntityReference",
                        "DateTimeAttribute",
                        "DateTimeBehaviour", "OData", "ODataEntityResult"
                    }
                }
            }.Concat(entity.ExternalOptionSets.Select(eos => new
            {
                File = "../OptionSets/" + eos.FileName,
                Types = new List<string>()
                {
                    eos.EnumName + " as " + eos.InternalEnumName
                }
            }));
        }

        public ImportsGenerator(ActionData action)
        {
            Model = new List<object>
            {
                new
                {
                    File = "../core/BaseActionProxy",
                    Types = new List<string>()
                    {
                        "EntityReference", "Process",
                        $"Base{(string.IsNullOrWhiteSpace(action.PrimaryEntity) ? string.Empty : "Target")}ActionProxy"
                    }
                }
            };
        }

        public override object Model { get; }
    }
}