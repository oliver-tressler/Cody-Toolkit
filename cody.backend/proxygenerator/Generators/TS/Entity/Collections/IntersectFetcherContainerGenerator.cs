using System;
using System.Linq;
using proxygenerator.Data.Model;
using proxygenerator.Generators.Contract;

namespace proxygenerator.Generators.TS.Entity.Collections
{
    public class IntersectFetcherContainerGenerator : CodeGenerator
    {
        public IntersectFetcherContainerGenerator(EntityData entity)
        {
            ChildrenSeparator = Environment.NewLine;
            IndentChildren = false;
            Children = entity.IntersectFetchers
                .Select(intersect => new IntersectFetcherGenerator(intersect)).ToList<CodeGenerator>();
        }
        public override object Model { get; }
    }
}