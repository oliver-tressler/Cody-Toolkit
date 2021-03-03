using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Xrm.Sdk.Metadata;
using Newtonsoft.Json;
using utils.proxies;
using SdkMessageProcessingStep = utils.proxies.SdkMessageProcessingStep;

namespace solutionmanagement.Model
{
    [JsonObject(MemberSerialization.OptOut)]
    public class PluginStepInfo
    {
        public PluginStepInfo(SdkMessageProcessingStep step, SdkMessageFilter filter, IEnumerable<AttributeMetadata> attributes)
        {
            Step = step;
            Filter = filter;
            Images = new Dictionary<Guid, PluginStepImageInfo>();
            var usedAttributes = step.FilteringAttributes?.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim()).ToHashSet();
            StepAttributes = attributes?.Select(attr => new PluginStepInfoAttribute
            {
                DisplayName = attr.DisplayName?.UserLocalizedLabel?.Label ?? attr.LogicalName,
                LogicalName = attr.LogicalName,
                Available = usedAttributes == null || usedAttributes.Contains(attr.LogicalName)
            }).OrderBy(a => a.DisplayName).ToArray();
            Name = step.Name;
            Id = step.Id;
            Stage = (int?)step.Stage;
            ExecutionOrder = step.Rank ?? 1;
            UserId = step.ImpersonatingUserId?.Id.ToString();
            MessageName = step.SdkMessageId.Name;
            MessageId = step.SdkMessageId.Id;
            if (filter != null && filter.PrimaryObjectTypeCode != "none")
            {
                EntityName = filter.PrimaryObjectTypeCode;
            }
            Description = step.Description;
            IsAsync = step.Mode == SdkMessageProcessingStep_Mode.Asynchronous;
            IsDeployedOffline =
                step.SupportedDeployment == SdkMessageProcessingStep_SupportedDeployment
                    .MicrosoftDynamics365ClientforOutlookOnly ||
                step.SupportedDeployment == SdkMessageProcessingStep_SupportedDeployment.Both;
            IsDeployedOnServer =
                step.SupportedDeployment == SdkMessageProcessingStep_SupportedDeployment.ServerOnly ||
                step.SupportedDeployment == SdkMessageProcessingStep_SupportedDeployment.Both;
            IsDisabled = step.StateCode == SdkMessageProcessingStepState.Disabled;
        }

        public PluginStepInfo()
        {
            Images = new Dictionary<Guid, PluginStepImageInfo>();
        }
        public string Name { get; set; }
        public Guid Id { get; set; }
        public int? Stage { get; set; }
        public int ExecutionOrder { get; set; }
        public string UserId { get; set; }
        public string MessageName { get; set; }
        public Guid MessageId { get; set; }
        public string EntityName { get; set; }
        public string Description { get; set; }

        public bool IsAsync { get; set; }
        public bool IsDisabled { get; set; }

        public bool IsDeployedOnServer { get; set; }
        public bool IsDeployedOffline { get; set; }
        public PluginStepInfoAttribute[] StepAttributes { get; set; }

        public bool? CanHaveImages => Stage != null && (IsAvailablePre(MessageName, (SdkMessageProcessingStep_Stage) Stage) == true ||
                                                        IsAvailablePost(MessageName, (SdkMessageProcessingStep_Stage) Stage) == true);

        [JsonIgnore]
        public Dictionary<Guid,PluginStepImageInfo> Images { get; }
        [JsonIgnore]
        public SdkMessageProcessingStep Step { get; }
        [JsonIgnore]
        public SdkMessageFilter Filter { get; }

        public static bool? IsAvailablePre(string messageName, SdkMessageProcessingStep_Stage? stage)
        {
            if (string.IsNullOrWhiteSpace(messageName) || stage == null) return null;
            return (messageName.Equals("Delete", StringComparison.CurrentCultureIgnoreCase) ||
                    messageName.Equals("Update", StringComparison.CurrentCultureIgnoreCase)) &&
                   (stage == SdkMessageProcessingStep_Stage.Prevalidation ||
                    stage == SdkMessageProcessingStep_Stage.Preoperation ||
                    stage == SdkMessageProcessingStep_Stage.Postoperation);
        }

        public static bool? IsAvailablePost(string messageName, SdkMessageProcessingStep_Stage? stage)
        {
            if (string.IsNullOrWhiteSpace(messageName) || stage == null) return null;
            return (messageName.Equals("Create", StringComparison.CurrentCultureIgnoreCase) ||
                    messageName.Equals("Update", StringComparison.CurrentCultureIgnoreCase)) &&
                   stage == SdkMessageProcessingStep_Stage.Postoperation;
        }
    }
}