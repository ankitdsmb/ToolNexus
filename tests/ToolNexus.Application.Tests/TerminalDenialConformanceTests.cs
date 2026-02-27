using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Pipeline.Steps;
using ToolNexus.Application.Services.Policies;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class TerminalDenialConformanceTests
{
    [Fact]
    public async Task ValidationDenial_SetsConformanceAndPreservesDeniedResponse()
    {
        var step = new ValidationStep(new EmptyGovernance(), new StaticPolicyRegistry());
        var context = new ToolExecutionContext("missing", "run", "{}", null);
        var nextCalled = false;

        var response = await step.InvokeAsync(
            context,
            (ctx, _) =>
            {
                nextCalled = true;
                return Task.FromResult(ctx.Response ?? new ToolExecutionResponse(true, "unexpected"));
            },
            CancellationToken.None);

        Assert.True(nextCalled);
        Assert.False(response.Success);
        Assert.Equal("validation_denied", context.Items[UniversalExecutionEngine.ConformanceStatusContextKey]);
    }

    [Fact]
    public async Task PolicyDenial_SetsConformanceAndPreservesDeniedResponse()
    {
        var step = new PolicyEnforcementStep(new Microsoft.AspNetCore.Http.HttpContextAccessor(), new AllowApiKeyValidator(), new AllowRateGuard());
        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new ToolExecutionPolicy("json", "Disabled", false, 30, 1024, 10, 0, ToolHttpMethodPolicy.GetOrPost, true, 1, 0, 1)
        };

        var nextCalled = false;
        var response = await step.InvokeAsync(
            context,
            (ctx, _) =>
            {
                nextCalled = true;
                return Task.FromResult(ctx.Response ?? new ToolExecutionResponse(true, "unexpected"));
            },
            CancellationToken.None);

        Assert.True(nextCalled);
        Assert.False(response.Success);
        Assert.Equal("policy_denied", context.Items[UniversalExecutionEngine.ConformanceStatusContextKey]);
    }

    private sealed class EmptyGovernance : IToolManifestGovernance
    {
        public IReadOnlyCollection<ToolManifest> GetAll() => [];
        public ToolManifest? FindBySlug(string slug) => null;
    }

    private sealed class StaticPolicyRegistry : IToolExecutionPolicyRegistry
    {
        public Task<IToolExecutionPolicy> GetPolicyAsync(string slug, CancellationToken cancellationToken = default)
            => Task.FromResult<IToolExecutionPolicy>(new ToolExecutionPolicy(slug, "server", true, 30, 1024, 10, 0, ToolHttpMethodPolicy.GetOrPost, true, 1, 0, 1));
    }

    private sealed class AllowApiKeyValidator : ToolNexus.Application.Services.IApiKeyValidator
    {
        public bool IsValid(ReadOnlySpan<char> providedKey) => true;
    }

    private sealed class AllowRateGuard : IToolExecutionRateGuard
    {
        public bool TryAcquire(string slug, int maxRequestsPerMinute) => true;
    }
}
