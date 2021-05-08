using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using proxygenerator.Utils;

namespace proxygenerator.Generators.Contract
{
    public abstract class CodeGenerator
    {
        public List<CodeGenerator> Children = new List<CodeGenerator>();
        protected bool? IndentChildren { get; set; }
        protected string ChildrenSeparator { get; set; }  
        public abstract object Model { get; }
        public bool ShouldGenerate = true;
        public string Generate()
        {
            return Generate(0);
        }

        private string Generate(int indentation)
        {
            if (!ShouldGenerate) return string.Empty;
            var childOutput = string.Empty;
            if (Children.Count > 0)
            {
                childOutput = string.Join(ChildrenSeparator ?? string.Empty, Children.Where(child => child.ShouldGenerate).Select(child => child.Generate(
                    IndentChildren ?? true ? 1 : 0)));
            }

            var templateName = TemplateLoader.GetTemplateName(GetType());
            if (string.IsNullOrWhiteSpace(templateName))
            {
                return childOutput;
            }
            var template = TemplateLoader.GetTemplate(templateName);
            var rendered = template.Render(new
            {
                model = Model ?? new object(),
                children = childOutput
            });
            return indentation == 0 ? rendered : rendered.PrefixLines(TextUtils.Indentation(indentation));
        }
    }
}
