using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Xrm.Sdk.Metadata;
using Newtonsoft.Json;
using utils.proxies;
using SdkMessageProcessingStep = utils.proxies.SdkMessageProcessingStep;

namespace pluginregistration.Model
{
    [JsonObject(MemberSerialization.OptIn)]
    public class PluginStepImageInfo
    {
        public PluginStepImageInfo()
        {

        }

        public PluginStepImageInfo(SdkMessageProcessingStepImage image, SdkMessageProcessingStep step, IEnumerable<AttributeMetadata> attributes)
        {
            Image = image;
            var usedAttributes = image?.Attributes1?.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim()).ToHashSet();
            ImageAttributes = attributes.Select(attr => new PluginStepInfoAttribute
            {
                DisplayName = attr.DisplayName?.UserLocalizedLabel?.Label ?? attr.LogicalName,
                LogicalName = attr.LogicalName,
                Available = usedAttributes == null || usedAttributes.Contains(attr.LogicalName)
            }).OrderBy(a => a.DisplayName).ToList();
            Step = step;
            
            AvailablePre = Step != null && PluginStepInfo.IsAvailablePre(Step.SdkMessageId?.Name, Step.Stage) == true;
            AvailablePost = Step != null && PluginStepInfo.IsAvailablePost(Step.SdkMessageId?.Name, Step.Stage) == true;

            if (image == null) return;
            Name = image.Name;
            Id = image.Id;
            EntityAlias = image.EntityAlias;
            IsPre = image.ImageType == SdkMessageProcessingStepImage_ImageType.PreImage ||
                    image.ImageType == SdkMessageProcessingStepImage_ImageType.Both;
            IsPost = image.ImageType == SdkMessageProcessingStepImage_ImageType.PostImage ||
                     image.ImageType == SdkMessageProcessingStepImage_ImageType.Both;
        }
        [JsonProperty]
        public string Name { get; set; }

        [JsonProperty]
        public string EntityAlias { get; set; }

        [JsonProperty]
        public Guid Id  { get; set; }

        [JsonProperty]
        public bool IsPre { get; set; }
        [JsonProperty]
        public bool IsPost { get; set; }

        [JsonProperty]
        public bool AvailablePre { get; set; }

        [JsonProperty]
        public bool AvailablePost { get; set; }


        [JsonProperty]
        public List<PluginStepInfoAttribute> ImageAttributes { get; set; }

        public SdkMessageProcessingStepImage Image { get; }
        public SdkMessageProcessingStep Step { get; }
    }
}