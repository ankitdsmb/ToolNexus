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
    CapabilityComplexityTier ComplexityTier,
    IReadOnlyCollection<string> Permissions,
    CapabilityRegistryStatus Status,
    CapabilityInstallationState InstallationState,
    CapabilityToolLink ToolLink,
    CapabilityGovernanceMetadata Governance);
