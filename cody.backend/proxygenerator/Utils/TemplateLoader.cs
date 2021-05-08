using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using proxygenerator.Generators.Contract;
using Scriban;

namespace proxygenerator.Utils
{
    public static class TemplateLoader
    {
        private static ConcurrentDictionary<string, Template> templateCache = new ConcurrentDictionary<string, Template>();

        private static List<string> templateFiles = Assembly.GetAssembly(typeof(TemplateLoader))
            .GetManifestResourceNames()
            .Where(res => res.EndsWith(".scriban-txt")).ToList();

        private static Dictionary<Type, string> identifiedGeneratorTemplates = new Dictionary<Type, string>(); 
        
        public static string GetTemplateName(Type codeGeneratorClass)
        {
            if (identifiedGeneratorTemplates.ContainsKey(codeGeneratorClass)) return identifiedGeneratorTemplates[codeGeneratorClass];
            if (!typeof(CodeGenerator).IsAssignableFrom(codeGeneratorClass))
            {
                throw new Exception("Unable to resolve template names for non-code-generator classes");
            }

            var currentType = codeGeneratorClass;
            var templateFile = string.Empty;
            while (currentType != null && !currentType.IsAbstract && typeof(CodeGenerator).IsAssignableFrom(currentType) && string.IsNullOrEmpty(templateFile))
            {
                templateFile = templateFiles.FirstOrDefault(fileName =>
                    fileName.Split('.').Last(name => name != "scriban-txt") == currentType.Name.Replace("Generator", ""));
                currentType = currentType.BaseType;
            }
            if (string.IsNullOrWhiteSpace(templateFile))
            {
                Console.WriteLine("Template not found for "+codeGeneratorClass.Name);
            }

            identifiedGeneratorTemplates.Add(codeGeneratorClass, templateFile);
            return templateFile;
        }

        public static Template GetTemplate(string templateName)
        {
            return templateCache.GetOrAdd(templateName, name =>
            {
                var template = Assembly.GetAssembly(typeof(TemplateLoader)).GetManifestResourceStream(name);
                var reader =
                    new StreamReader(template ??
                                     throw new InvalidOperationException("Unable to resolve template file " + name));
                template.Seek(0, SeekOrigin.Begin);
                var parsedTemplate = Template.Parse(reader.ReadToEnd());
                return parsedTemplate;
            });
        }
    }
}