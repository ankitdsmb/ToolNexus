namespace ToolNexus.Application.Options;

public sealed class CapabilityMarketplaceOptions
{
    public const string SectionName = "CapabilityMarketplace";

    public bool SyncOnRead { get; init; } = true;
    public int MaxDashboardLimit { get; init; } = 200;
}
