using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Pipeline.Steps;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Tests;

public sealed class ExecutionStepUniversalAdapterTests
{
    [Fact]
    public async Task InvokeAsync_DefaultsToDotNetLanguageAndPreservesToolResponse()
    {
        var requestCapture = default(UniversalToolExecutionRequest);
        var engine = new StubEngine((request, _, _) =>
        {
            requestCapture = request;
            return Task.FromResult(new UniversalToolExecutionResult(
                true,
                "formatted",
                null,
                false,
                request.ToolId,
                request.ToolVersion,
                request.Language,
                request.Operation,
                request.ExecutionPolicyId,
                request.ResourceClass,
                2,
                request.TenantId,
                request.CorrelationId));
        });

        var step = new ExecutionStep(engine);
        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };

        var response = await step.InvokeAsync(
            context,
            static (ctx, _) => Task.FromResult(ctx.Response ?? new ToolExecutionResponse(false, string.Empty, "missing response")),
            CancellationToken.None);

        Assert.NotNull(requestCapture);
        Assert.Equal(DotNetExecutionAdapter.DotNetLanguage, requestCapture!.Language);
        Assert.Equal("formatted", response.Output);
        Assert.True(response.Success);
    }

    private sealed class StubEngine(
        Func<UniversalToolExecutionRequest, ToolExecutionContext, CancellationToken, Task<UniversalToolExecutionResult>> handler) : IUniversalExecutionEngine
    {
        public Task<UniversalToolExecutionResult> ExecuteAsync(
            UniversalToolExecutionRequest request,
            ToolExecutionContext context,
            CancellationToken cancellationToken = default)
            => handler(request, context, cancellationToken);
    }

    private sealed class StubPolicy : IToolExecutionPolicy
    {
        public string Slug => "json";
        public string ExecutionMode => "api";
        public bool IsExecutionEnabled => true;
        public int TimeoutSeconds => 30;
        public int MaxInputSize => 1000;
        public int MaxRequestsPerMinute => 60;
        public int CacheTtlSeconds => 10;
        public ToolHttpMethodPolicy AllowedHttpMethods => ToolHttpMethodPolicy.GetOrPost;
        public bool AllowAnonymous => true;
        public int MaxConcurrency => 4;
        public int RetryCount => 0;
        public int CircuitBreakerFailureThreshold => 5;
    }
}
