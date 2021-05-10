using System;
using System.Collections.Generic;
using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Data.Model.Attributes;
using proxygenerator.Generators.Contract;
using proxygenerator.Generators.TS.Entity.Attributes;
using proxygenerator.Generators.TS.Entity.Collections;
using proxygenerator.Generators.TS.Entity.OptionSets;
using proxygenerator.Generators.TS.Entity.Properties;

namespace proxygenerator.Generators.TS.Entity
{
    public class ProxyGenerator : CodeGenerator
    {
        public ProxyGenerator(EntityData entity)
        {
            IndentChildren = false;
            ChildrenSeparator = Environment.NewLine;
            Children = new List<CodeGenerator>
            {
                new ImportsGenerator(entity),
                new CommentGenerator(entity.ClassComment),
                new EntityClassGenerator(entity),
                new InternalOptionSetsContainerGenerator(entity),
            };
        }

        public override object Model { get; }
    }
}
