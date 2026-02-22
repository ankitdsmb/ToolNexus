using Microsoft.AspNetCore.Http;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Pipeline.Steps;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Tests;

public sealed class PolicyEnforcementStepTests
{
    [Fact]
    public async Task InvokeAsync_Blocks_WhenExecutionDisabled()
    {
        var step = BuildStep(new AlwaysAllowRateGuard());
        var context = BuildContext(new ToolExecutionPolicy("json", "Disabled", false, 30, 1024, 10, 10, ToolHttpMethodPolicy.GetOrPost, true, 1, 0, 1));

        var response = await step.InvokeAsync(context, (_, _) => Task.FromResult(new ToolExecutionResponse(true, "ok")), default);

        Assert.False(response.Success);
        Assert.Contains("disabled", response.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InvokeAsync_Blocks_WhenTimeoutInvalid()
    {
        var step = BuildStep(new AlwaysAllowRateGuard());
        var context = BuildContext(new ToolExecutionPolicy("json", "Local", true, 0, 1024, 10, 10, ToolHttpMethodPolicy.GetOrPost, true, 1, 0, 1));

        var response = await step.InvokeAsync(context, (_, _) => Task.FromResult(new ToolExecutionResponse(true, "ok")), default);

        Assert.False(response.Success);
        Assert.Contains("timeout", response.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InvokeAsync_Blocks_WhenPayloadTooLarge()
    {
        var step = BuildStep(new AlwaysAllowRateGuard());
        var context = BuildContext(new ToolExecutionPolicy("json", "Local", true, 30, 3, 10, 10, ToolHttpMethodPolicy.GetOrPost, true, 1, 0, 1), input: "1234");

        var response = await step.InvokeAsync(context, (_, _) => Task.FromResult(new ToolExecutionResponse(true, "ok")), default);

        Assert.False(response.Success);
        Assert.Contains("payload", response.Error, StringComparison.OrdinalIgnoreCase);
    }

    private static PolicyEnforcementStep BuildStep(IToolExecutionRateGuard rateGuard)
    {
        var http = new DefaultHttpContext();
        http.Request.Method = HttpMethods.Post;
        var accessor = new HttpContextAccessor { HttpContext = http };
        return new PolicyEnforcementStep(accessor, new AllowApiKeyValidator(), rateGuard);
    }

    private static ToolExecutionContext BuildContext(IToolExecutionPolicy policy, string input = "abc")
        => new("json", "format", input, null) { Policy = policy };

    private sealed class AllowApiKeyValidator : IApiKeyValidator
    {
        public bool IsValid(ReadOnlySpan<char> providedKey) => true;
    }

    private sealed class AlwaysAllowRateGuard : IToolExecutionRateGuard
    {
        public bool TryAcquire(string slug, int maxRequestsPerMinute) => true;
    }
}
