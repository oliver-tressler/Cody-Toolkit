using System;
using System.Linq;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Client;

namespace webresourcepublish
{
    public class WebResourcePublisher
    {
        public WebResourceConfiguration Configuration { get; }
        public WebResourcePublisher(WebResourceConfiguration configuration)
        {
            Configuration = configuration;
        }

        public void UpdateWebResource(IOrganizationService service)
        {
            var newResource = Configuration.ToWebResource();
            if (HasExistingWebResource(service, out var resource))
            {
                if (resource["content"] == newResource["content"])
                {
                    return;
                }

                newResource.Id = resource.Id;
                newResource.EntityState = EntityState.Changed;
                service.Update(newResource);
            }
            else
            {
                newResource.Id = service.Create(newResource);
            }
            PublishWebResource(service, newResource.Id);
        }

        public void PublishWebResource(IOrganizationService service, Guid resourceId)
        {
            
            string webrescXml =
                $"<importexportxml><webresources><webresource>{resourceId}</webresource></webresources></importexportxml>";
            PublishXmlRequest xmlRequest = new PublishXmlRequest
            {
                ParameterXml = webrescXml
            };
            service.Execute(xmlRequest);
        }

        public bool HasExistingWebResource(IOrganizationService service, out Entity webResource)
        {
            var ctx = new OrganizationServiceContext(service);
            var webResources = (from res in ctx.CreateQuery("webresource")
                                where
                                    (string)res["name"] == Configuration.Name
                                select res).ToList();
            webResource = webResources.FirstOrDefault();
            return webResource != null;
        }
    }

    public class WebResourceConfiguration
    {
        public string Name { get; }
        public string DisplayName { get; }
        public string Content { get; }
        public string ResourceType { get; }

        public WebResourceConfiguration(string name, string displayName, byte[] content, string resourceExtension)
        {
            Name = name;
            DisplayName = displayName;
            Content = Convert.ToBase64String(content);
            ResourceType = resourceExtension;
        }

        public Entity ToWebResource()
        {
            return new Entity("webresource")
            {
                ["name"] = Name,
                ["displayname"] = DisplayName,
                ["content"] = Content,
                ["webresourcetype"] = new OptionSetValue((int)GetResourceType())
            };
        }

        public enum EType
        {
            ///<summary><para>Webpage (HTML)</para>
            ///<para>Value = 1</para></summary>
            WebpageHtml = 1,
            ///<summary><para>Style Sheet (CSS)</para>
            ///<para>Value = 2</para></summary>
            StyleSheetCss = 2,
            ///<summary><para>Script (JScript)</para>
            ///<para>Value = 3</para></summary>
            ScriptJScript = 3,
            ///<summary><para>Data (XML)</para>
            ///<para>Value = 4</para></summary>
            DataXml = 4,
            ///<summary><para>PNG format</para>
            ///<para>Value = 5</para></summary>
            PngFormat = 5,
            ///<summary><para>JPG format</para>
            ///<para>Value = 6</para></summary>
            JpgFormat = 6,
            ///<summary><para>GIF format</para>
            ///<para>Value = 7</para></summary>
            GifFormat = 7,
            ///<summary><para>Silverlight (XAP)</para>
            ///<para>Value = 8</para></summary>
            SilverlightXap = 8,
            ///<summary><para>Style Sheet (XSL)</para>
            ///<para>Value = 9</para></summary>
            StyleSheetXsl = 9,
            ///<summary><para>ICO format</para>
            ///<para>Value = 10</para></summary>
            IcoFormat = 10
        }

        private EType GetResourceType()
        {
            var extension = ResourceType?.ToLower() ?? "";
            switch (extension)
            {
                case ".js":
                    return EType.ScriptJScript;
                case ".html":
                    return EType.WebpageHtml;
                case ".css":
                    return EType.StyleSheetCss;
                case ".png":
                    return EType.PngFormat;
                case ".jpg":
                    return EType.JpgFormat;
                case ".gif":
                    return EType.GifFormat;
                case ".ico":
                    return EType.IcoFormat;
                default:
                    throw new ArgumentOutOfRangeException(extension);
            }
        }
    }
}
