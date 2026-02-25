using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services.Pipeline;

namespace ToolNexus.Application.Tests;

public sealed class DefaultExecutionAdmissionControllerTests
{
    [Fact]
    public void Evaluate_AllowsByDefault()
    {
        var controller = CreateController(new ExecutionAdmissionOptions());

        var decision = controller.Evaluate(CreateSnapshot(), CreateContext());

        Assert.True(decision.IsAllowed);
        Assert.Equal("Allowed", decision.ReasonCode);
        Assert.Equal("DefaultExecutionAdmissionController", decision.DecisionSource);
    }

    [Fact]
    public void Evaluate_DeniesShadowAuthority()
    {
        var controller = CreateController(new ExecutionAdmissionOptions());

        var decision = controller.Evaluate(CreateSnapshot(authority: ExecutionAuthority.ShadowOnly), CreateContext());

        Assert.False(decision.IsAllowed);
        Assert.Equal("ShadowOnly", decision.ReasonCode);
    }

    [Fact]
    public void Evaluate_DeniesUnsupportedRuntime()
    {
        var options = new ExecutionAdmissionOptions { SupportedRuntimeLanguages = ["dotnet"] };
        var controller = CreateController(options);

        var decision = controller.Evaluate(CreateSnapshot(language: new ToolRuntimeLanguage("ruby")), CreateContext());

        Assert.False(decision.IsAllowed);
        Assert.Equal("RuntimeUnavailable", decision.ReasonCode);
    }

    [Fact]
    public void Evaluate_DeniesBlockedCapability()
    {
        var options = new ExecutionAdmissionOptions { BlockedCapabilities = [ToolExecutionCapability.Sandboxed.Value] };
        var controller = CreateController(options);

        var decision = controller.Evaluate(CreateSnapshot(capability: ToolExecutionCapability.Sandboxed), CreateContext());

        Assert.False(decision.IsAllowed);
        Assert.Equal("CapabilityBlocked", decision.ReasonCode);
    }

    private static DefaultExecutionAdmissionController CreateController(ExecutionAdmissionOptions options)
        => new(Options.Create(options));

    private static ExecutionSnapshot CreateSnapshot(
        ExecutionAuthority authority = ExecutionAuthority.UnifiedAuthoritative,
        ToolRuntimeLanguage? language = null,
        ToolExecutionCapability? capability = null)
    {
        return new ExecutionSnapshot(
            "snap-1",
            authority,
            language ?? ToolRuntimeLanguage.DotNet,
            capability ?? ToolExecutionCapability.Standard,
            "corr-1",
            "tenant-1",
            DateTime.UtcNow,
            "v1",
            null);
    }

    private static ToolExecutionContext CreateContext()
        => new("json", "format", "{}", null);
}
