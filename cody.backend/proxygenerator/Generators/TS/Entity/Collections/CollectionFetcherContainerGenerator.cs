using System;
using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Collections
{
    public class CollectionFetcherContainerGenerator : CodeGenerator
    {
        public CollectionFetcherContainerGenerator(EntityData entity)
        {
            ChildrenSeparator = Environment.NewLine;
            IndentChildren = false;
            Children = entity.CollectionFetchers.Select(cf => new CollectionFetcherGenerator(cf))
                .ToList<CodeGenerator>();
        }
        public override object Model { get; }
    }
}