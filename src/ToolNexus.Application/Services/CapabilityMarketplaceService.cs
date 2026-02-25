using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Services;

public sealed class CapabilityMarketplaceService(
    IToolCatalogService toolCatalogService,
    IExecutionPolicyService executionPolicyService,
    IExecutionAuthorityResolver executionAuthorityResolver,
    IExecutionSnapshotBuilder executionSnapshotBuilder) : ICapabilityMarketplaceService
{
    private const string Provider = "toolnexus.core";

    public async Task<IReadOnlyCollection<CapabilityRegistryEntry>> GetInstalledCapabilities(CancellationToken cancellationToken = default)
    {
        var tools = toolCatalogService.GetAllTools();
        var entries = new List<CapabilityRegistryEntry>(tools.Count);

        foreach (var tool in tools)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var policy = await executionPolicyService.GetBySlugAsync(tool.Slug, cancellationToken);
            var installationState = ResolveInstallationState(tool, policy);
            var status = ResolveRegistryStatus(installationState);

            var request = new UniversalToolExecutionRequest(
                tool.Slug,
                tool.Version,
                ToolRuntimeLanguage.From(tool.RuntimeLanguage, ToolRuntimeLanguage.DotNet),
                tool.Actions.FirstOrDefault() ?? "discover",
                string.Empty,
                $"policy:{policy.ToolSlug}",
                tool.ExecutionCapability,
                policy.TimeoutSeconds * 1000,
                null,
                null,
                ToolExecutionCapability.From(tool.ExecutionCapability, ToolExecutionCapability.Standard));

            var context = new ToolExecutionContext(tool.Slug, request.Operation, request.InputPayload, request.Options)
            {
                Policy = ToExecutionPolicy(policy)
            };

            var authority = executionAuthorityResolver.ResolveAuthority(context, request);
            var snapshot = executionSnapshotBuilder.BuildSnapshot(request, context, authority);
            var permissions = ResolvePermissions(tool);

            var capabilityId = BuildCapabilityId(tool.Slug, tool.Version);
            var toolLink = new CapabilityToolLink(capabilityId, tool.Slug);

            entries.Add(new CapabilityRegistryEntry(
                capabilityId,
                Provider,
                tool.Version,
                tool.Slug,
                request.RuntimeLanguage,
                ResolveComplexityTier(tool),
                permissions,
                status,
                installationState,
                toolLink,
                new CapabilityGovernanceMetadata(authority, snapshot.SnapshotId, policy.VersionToken, policy.IsExecutionEnabled)));
        }

        return entries;
    }

    private static string BuildCapabilityId(string toolSlug, string version)
        => $"cap:{toolSlug}:{version}";

    private static CapabilityInstallationState ResolveInstallationState(ToolDescriptor tool, ToolExecutionPolicyModel policy)
    {
        if (tool.IsDeprecated)
        {
            return CapabilityInstallationState.Deprecated;
        }

        return policy.IsExecutionEnabled
            ? CapabilityInstallationState.Enabled
            : CapabilityInstallationState.Disabled;
    }

    private static CapabilityRegistryStatus ResolveRegistryStatus(CapabilityInstallationState state)
        => state switch
        {
            CapabilityInstallationState.Deprecated => CapabilityRegistryStatus.Deprecated,
            CapabilityInstallationState.Disabled => CapabilityRegistryStatus.Disabled,
            CapabilityInstallationState.Enabled => CapabilityRegistryStatus.Installed,
            _ => CapabilityRegistryStatus.Installed
        };

    private static CapabilityComplexityTier ResolveComplexityTier(ToolDescriptor tool)
    {
        if (tool.IsCpuIntensive)
        {
            return CapabilityComplexityTier.Advanced;
        }

        return tool.Actions.Count > 1
            ? CapabilityComplexityTier.Standard
            : CapabilityComplexityTier.Basic;
    }

    private static IReadOnlyCollection<string> ResolvePermissions(ToolDescriptor tool)
    {
        if (tool.RequiresAuthentication)
        {
            return ["tool.execute.authenticated"];
        }

        return ["tool.execute.anonymous"];
    }

    private static IToolExecutionPolicy ToExecutionPolicy(ToolExecutionPolicyModel model)
        => new ToolExecutionPolicy(
            model.ToolSlug,
            model.ExecutionMode,
            model.IsExecutionEnabled,
            model.TimeoutSeconds,
            model.MaxInputSize,
            model.MaxRequestsPerMinute,
            CacheTtlSeconds: 0,
            ToolHttpMethodPolicy.GetOrPost,
            AllowAnonymous: false,
            MaxConcurrency: 1,
            RetryCount: 0,
            CircuitBreakerFailureThreshold: 1);
}
