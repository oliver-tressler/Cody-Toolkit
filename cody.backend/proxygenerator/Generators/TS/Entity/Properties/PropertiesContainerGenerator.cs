using System;
using System.Collections.Generic;
using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Properties
{
    public class PropertiesContainerGenerator : CodeGenerator
    {
        public PropertiesContainerGenerator(EntityData entity)
        {
            ChildrenSeparator = Environment.NewLine;
            IndentChildren = false;
            Children = entity.Attributes.SelectMany(ad => new List<CodeGenerator>
            {
                new CommentGenerator(ad.Getter.Comment)
                {
                    ShouldGenerate = ad.Getter.Generate
                },
                ad is OptionSetAttributeData osad
                    ? new OptionSetGetterPropertyGenerator(osad, entity)
                    : new DefaultGetterPropertyGenerator(ad, entity) as CodeGenerator,
                ad is OptionSetAttributeData osad2
                    ? new OptionSetSetterPropertyGenerator(osad2, entity)
                    : new DefaultSetterPropertyGenerator(ad, entity) as CodeGenerator,
                new CommentGenerator(ad.FormattedGetter.Comment)
                {
                    ShouldGenerate = ad.FormattedGetter.Generate
                },
                ad is OptionSetAttributeData osad3
                    ? new OptionSetFormattedGetterPropertyGenerator(osad3, entity)
                    : new DefaultFormattedGetterPropertyGenerator(ad, entity) as CodeGenerator,
            }).ToList();
        }
        public override object Model { get; }
    }
}