using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class CapabilityMarketplaceServiceTests
{
    [Fact]
    public async Task GetInstalledCapabilities_ProducesValidRegistryMetadata()
    {
        var service = CreateService([
            new ToolDescriptor
            {
                Slug = "json-formatter",
                Title = "JSON Formatter",
                Category = "json",
                Actions = ["format", "minify"],
                SeoTitle = "t",
                SeoDescription = "d",
                ExampleInput = "{}",
                Version = "1.4.0",
                RuntimeLanguage = "python",
                IsCpuIntensive = true,
                RequiresAuthentication = true,
                ExecutionCapability = "sandboxed"
            }
        ], enabledSlugs: ["json-formatter"]);

        var capabilities = await service.GetInstalledCapabilities();

        var entry = Assert.Single(capabilities);
        Assert.Equal("cap:json-formatter:1.4.0", entry.CapabilityId);
        Assert.Equal("toolnexus.core", entry.Provider);
        Assert.Equal("json-formatter", entry.ToolId);
        Assert.Equal(ToolRuntimeLanguage.Python, entry.RuntimeLanguage);
        Assert.Equal(CapabilityComplexityTier.Advanced, entry.ComplexityTier);
        Assert.Contains("tool.execute.authenticated", entry.Permissions);
        Assert.Equal(CapabilityRegistryStatus.Installed, entry.Status);
        Assert.Equal(CapabilityInstallationState.Enabled, entry.InstallationState);
        Assert.Equal(entry.CapabilityId, entry.ToolLink.CapabilityId);
        Assert.Equal(entry.ToolId, entry.ToolLink.ToolId);
        Assert.False(string.IsNullOrWhiteSpace(entry.Governance.SnapshotId));
        Assert.True(entry.Governance.PolicyExecutionEnabled);
    }

    [Fact]
    public async Task GetInstalledCapabilities_MapsCapabilityToToolConsistently()
    {
        var service = CreateService([
            BuildDescriptor("url-encode", requiresAuthentication: false),
            BuildDescriptor("xml-formatter", requiresAuthentication: true)
        ], enabledSlugs: ["url-encode", "xml-formatter"]);

        var capabilities = await service.GetInstalledCapabilities();

        Assert.Equal(2, capabilities.Count);
        Assert.All(capabilities, entry =>
        {
            Assert.Equal(entry.ToolId, entry.ToolLink.ToolId);
            Assert.Equal(entry.CapabilityId, entry.ToolLink.CapabilityId);
            Assert.StartsWith($"cap:{entry.ToolId}:", entry.CapabilityId, StringComparison.Ordinal);
        });
    }

    [Fact]
    public async Task GetInstalledCapabilities_HandlesLifecycleStatesSafely()
    {
        var service = CreateService([
            BuildDescriptor("enabled-tool"),
            BuildDescriptor("disabled-tool"),
            BuildDescriptor("deprecated-tool", isDeprecated: true)
        ], enabledSlugs: ["enabled-tool", "deprecated-tool"]);

        var capabilities = await service.GetInstalledCapabilities();

        var enabled = Assert.Single(capabilities.Where(x => x.ToolId == "enabled-tool"));
        var disabled = Assert.Single(capabilities.Where(x => x.ToolId == "disabled-tool"));
        var deprecated = Assert.Single(capabilities.Where(x => x.ToolId == "deprecated-tool"));

        Assert.Equal(CapabilityInstallationState.Enabled, enabled.InstallationState);
        Assert.Equal(CapabilityRegistryStatus.Installed, enabled.Status);

        Assert.Equal(CapabilityInstallationState.Disabled, disabled.InstallationState);
        Assert.Equal(CapabilityRegistryStatus.Disabled, disabled.Status);

        Assert.Equal(CapabilityInstallationState.Deprecated, deprecated.InstallationState);
        Assert.Equal(CapabilityRegistryStatus.Deprecated, deprecated.Status);
    }

    private static CapabilityMarketplaceService CreateService(
        IReadOnlyCollection<ToolDescriptor> tools,
        IReadOnlyCollection<string> enabledSlugs)
    {
        var catalog = new StubToolCatalogService(tools);
        var policyService = new StubExecutionPolicyService(enabledSlugs);
        var resolver = new DefaultExecutionAuthorityResolver(Microsoft.Extensions.Options.Options.Create(new ExecutionAuthorityOptions()));
        var snapshotBuilder = new DefaultExecutionSnapshotBuilder();

        return new CapabilityMarketplaceService(catalog, policyService, resolver, snapshotBuilder, new StubCapabilityMarketplaceRepository(), TimeProvider.System, Microsoft.Extensions.Options.Options.Create(new CapabilityMarketplaceOptions()), NullLogger<CapabilityMarketplaceService>.Instance);
    }

    private static ToolDescriptor BuildDescriptor(string slug, bool requiresAuthentication = true, bool isDeprecated = false)
        => new()
        {
            Slug = slug,
            Title = slug,
            Category = "general",
            Actions = ["run"],
            SeoTitle = slug,
            SeoDescription = slug,
            ExampleInput = "",
            Version = "1.0.0",
            RuntimeLanguage = "dotnet",
            RequiresAuthentication = requiresAuthentication,
            IsDeprecated = isDeprecated,
            ExecutionCapability = "standard"
        };

    private sealed class StubToolCatalogService(IReadOnlyCollection<ToolDescriptor> tools) : IToolCatalogService
    {
        public IReadOnlyCollection<ToolDescriptor> GetAllTools() => tools;

        public IReadOnlyCollection<string> GetAllCategories() => tools.Select(x => x.Category).Distinct().ToArray();

        public ToolDescriptor? GetBySlug(string slug) => tools.FirstOrDefault(x => x.Slug == slug);

        public IReadOnlyCollection<ToolDescriptor> GetByCategory(string category) => tools.Where(x => x.Category == category).ToArray();

        public bool CategoryExists(string category) => tools.Any(x => x.Category == category);
    }

    private sealed class StubCapabilityMarketplaceRepository : ICapabilityMarketplaceRepository
    {
        public Task<CapabilityMarketplaceDashboard> GetDashboardAsync(CapabilityMarketplaceQuery query, CancellationToken cancellationToken)
            => Task.FromResult(new CapabilityMarketplaceDashboard(DateTime.UtcNow, Array.Empty<CapabilityRegistryEntry>()));

        public Task UpsertAsync(IReadOnlyCollection<CapabilityRegistryEntry> entries, DateTime syncedAtUtc, CancellationToken cancellationToken)
            => Task.CompletedTask;
    }

    private sealed class StubExecutionPolicyService(IReadOnlyCollection<string> enabledSlugs) : IExecutionPolicyService
    {
        public Task<ToolExecutionPolicyModel> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
            => Task.FromResult(new ToolExecutionPolicyModel(
                ToolId: Math.Abs(slug.GetHashCode()),
                ToolSlug: slug,
                ExecutionMode: "server",
                TimeoutSeconds: 30,
                MaxRequestsPerMinute: 60,
                MaxInputSize: 4096,
                IsExecutionEnabled: enabledSlugs.Contains(slug, StringComparer.OrdinalIgnoreCase),
                VersionToken: "v1"));

        public Task<ToolExecutionPolicyModel?> GetByToolIdAsync(int toolId, CancellationToken cancellationToken = default)
            => Task.FromResult<ToolExecutionPolicyModel?>(null);

        public Task<ToolExecutionPolicyModel> UpdateBySlugAsync(string slug, UpdateToolExecutionPolicyRequest request, CancellationToken cancellationToken = default)
            => throw new NotSupportedException();

        public void Invalidate(string slug)
        {
        }
    }
}
