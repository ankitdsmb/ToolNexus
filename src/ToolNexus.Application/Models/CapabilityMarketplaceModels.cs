using ToolNexus.Application.Services.Pipeline;

namespace ToolNexus.Application.Models;

public enum CapabilityRegistryStatus
{
    Installed = 0,
    Disabled = 1,
    Deprecated = 2
}

public enum CapabilityInstallationState
{
    Installed = 0,
    Enabled = 1,
    Disabled = 2,
    Deprecated = 3
}

public enum CapabilityComplexityTier
{
    Basic = 0,
    Standard = 1,
    Advanced = 2
}

public enum CapabilityUiRenderingType
{
    AutoRuntime = 0,
    SchemaDriven = 1,
    Custom = 2
}

public enum CapabilityActivationState
{
    Active = 0,
    Inactive = 1,
    Deprecated = 2
}

public sealed record CapabilityToolLink(
    string CapabilityId,
    string ToolId);

public sealed record CapabilityGovernanceMetadata(
    ExecutionAuthority Authority,
    string SnapshotId,
    string? PolicyVersionToken,
    bool PolicyExecutionEnabled);

public sealed record CapabilityRegistryEntry(
    string CapabilityId,
    string Provider,
    string Version,
    string ToolId,
    ToolRuntimeLanguage RuntimeLanguage,
    ToolExecutionCapability ExecutionCapabilityType,
    CapabilityUiRenderingType UiRenderingType,
    CapabilityActivationState ActivationState,
    CapabilityComplexityTier ComplexityTier,
    IReadOnlyCollection<string> Permissions,
    CapabilityRegistryStatus Status,
    CapabilityInstallationState InstallationState,
    CapabilityToolLink ToolLink,
    CapabilityGovernanceMetadata Governance);

public sealed record CapabilityMarketplaceQuery(
    int Limit = 100,
    string? ToolId = null,
    string? CapabilityId = null,
    CapabilityRegistryStatus? Status = null,
    DateTime? SyncedAfterUtc = null);

public sealed record CapabilityMarketplaceDashboard(
    DateTime LastSyncedUtc,
    IReadOnlyCollection<CapabilityRegistryEntry> Items);
