using System.Collections.Generic;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace utils.proxies
{
    public partial class PluginAssembly
    {
        /// <summary>
        /// <para><b>Plug_inType (Plugin Assembly)</b></para>
        /// <para>Schema Name: pluginassembly_plugintype</para>
        /// </summary>
        public List<PluginType> GetPlug_inTypes_PluginAssembly(IOrganizationService service, ColumnSet columns) { return FetchHelper.GetRelatedOneToManyEntities<PluginType>(service, Id, "plugintype", "pluginassemblyid", columns); }
    }

    public partial class PluginType
    {
        /// <summary>
        /// <para><b>SdkMessageProcessingStep (Plug-In Type)</b></para>
        /// <para>Schema Name: plugintypeid_sdkmessageprocessingstep</para>
        /// </summary>
        public List<SdkMessageProcessingStep> GetSdkMessageProcessingSteps_Plug_InType(IOrganizationService service, ColumnSet columns) { return FetchHelper.GetRelatedOneToManyEntities<SdkMessageProcessingStep>(service, Id, "sdkmessageprocessingstep", "plugintypeid", columns); }

    }

    public partial class SdkMessageProcessingStep
    {
        /// <summary>
        /// <para><b>SdkMessageProcessingStepImage (SDK Message Processing Step)</b></para>
        /// <para>Schema Name: sdkmessageprocessingstepid_sdkmessageprocessingstepimage</para>
        /// </summary>
        public List<SdkMessageProcessingStepImage> GetSdkMessageProcessingStepImages_SDKMessageProcessingStep(IOrganizationService service, ColumnSet columns) { return FetchHelper.GetRelatedOneToManyEntities<SdkMessageProcessingStepImage>(service, Id, "sdkmessageprocessingstepimage", "sdkmessageprocessingstepid", columns); }

    }

    public partial class SdkMessage
    {
        /// <summary>
        /// <para><b>SdkMessageFilter (SDK Message ID)</b></para>
        /// <para>Schema Name: sdkmessageid_sdkmessagefilter</para>
        /// </summary>
        public List<SdkMessageFilter> GetSdkMessageFilters_SDKMessageID(IOrganizationService service, ColumnSet columns) { return FetchHelper.GetRelatedOneToManyEntities<SdkMessageFilter>(service, Id, "sdkmessagefilter", "sdkmessageid", columns); }
    }
}
