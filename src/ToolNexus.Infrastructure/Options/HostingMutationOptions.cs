namespace ToolNexus.Infrastructure.Options;

public sealed class HostingMutationOptions
{
    public const string SectionName = "Hosting";

    public bool AllowRuntimeMutation { get; set; }
}
