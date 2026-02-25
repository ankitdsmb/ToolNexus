using System.Text.Json;
using System.Text.RegularExpressions;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class PythonExecutionAdapter(WorkerExecutionOrchestrator workerExecutionOrchestrator) : ILanguageExecutionAdapter
{
    public ToolRuntimeLanguage Language => ToolRuntimeLanguage.Python;

    public async Task<UniversalToolExecutionResult> ExecuteAsync(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);

        var envelope = WorkerExecutionEnvelope.Create(
            request.ToolId,
            request.Operation,
            request.InputPayload,
            CreatePolicySnapshot(context),
            CreateResourceLimits(request, context),
            request.CorrelationId,
            request.TenantId);

        var workerType = WorkerType.Create(request.RuntimeLanguage, request.ExecutionCapability);
        var orchestration = await workerExecutionOrchestrator.PrepareExecutionAsync(envelope, workerType, cancellationToken);

        context.Items[UniversalExecutionEngine.WorkerTypeContextKey] = workerType.ToString();
        context.Items[UniversalExecutionEngine.WorkerManagerUsedContextKey] = "true";
        context.Items[UniversalExecutionEngine.WorkerLeaseAcquiredContextKey] = orchestration.LeaseAcquired.ToString().ToLowerInvariant();
        context.Items[UniversalExecutionEngine.WorkerLeaseStateContextKey] = orchestration.WorkerLeaseState.ToString();
        context.Items[UniversalExecutionEngine.WorkerOrchestratorUsedContextKey] = "true";

        var fallbackOutput = BuildRuntimeDisabledPayload(request, orchestration);

        var response = new ToolExecutionResponse(true, fallbackOutput);
        return UniversalToolExecutionResult.FromToolExecutionResponse(response, request, durationMs: 0);
    }

    private static string BuildRuntimeDisabledPayload(UniversalToolExecutionRequest request, WorkerOrchestrationResult orchestration)
    {
        if (string.Equals(request.ToolId, "text-intelligence-analyzer", StringComparison.OrdinalIgnoreCase)
            && string.Equals(request.Operation, "analyze", StringComparison.OrdinalIgnoreCase))
        {
            return BuildTextAnalyzerFallbackPayload(request.InputPayload, orchestration);
        }

        return JsonSerializer.Serialize(new
        {
            status = "runtime-not-enabled",
            analysisPreview = new
            {
                message = "Python runtime execution is not enabled for this tool in the current deployment phase.",
                workerPreparationStatus = orchestration.Preparation.Status,
                operation = request.Operation
            }
        });
    }

    private static string BuildTextAnalyzerFallbackPayload(string inputPayload, WorkerOrchestrationResult orchestration)
    {
        var text = ParseText(inputPayload);
        var words = Regex.Matches(text, "\\b[\\p{L}\\p{Nd}']+\\b", RegexOptions.CultureInvariant);
        var sentenceCount = Regex.Matches(text, "[.!?]+", RegexOptions.CultureInvariant).Count;
        if (sentenceCount == 0 && words.Count > 0)
        {
            sentenceCount = 1;
        }

        var wordCount = words.Count;
        var avgWordLength = wordCount == 0
            ? 0d
            : Math.Round(words.Average(x => x.Value.Length), 2, MidpointRounding.AwayFromZero);

        var topKeywords = words
            .Select(x => x.Value.ToLowerInvariant())
            .Where(x => x.Length >= 4)
            .GroupBy(x => x, StringComparer.Ordinal)
            .OrderByDescending(group => group.Count())
            .ThenBy(group => group.Key, StringComparer.Ordinal)
            .Take(5)
            .Select(group => group.Key)
            .ToArray();

        var readabilityScore = sentenceCount == 0
            ? 0d
            : Math.Round((wordCount / (double)sentenceCount) + avgWordLength, 2, MidpointRounding.AwayFromZero);

        return JsonSerializer.Serialize(new
        {
            status = "runtime-not-enabled",
            analysisPreview = new
            {
                wordCount,
                sentenceCount,
                avgWordLength,
                topKeywords,
                readabilityScore,
                workerPreparationStatus = orchestration.Preparation.Status
            }
        });
    }

    private static string ParseText(string inputPayload)
    {
        try
        {
            using var document = JsonDocument.Parse(inputPayload);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return string.Empty;
            }

            if (document.RootElement.TryGetProperty("text", out var textElement)
                && textElement.ValueKind == JsonValueKind.String)
            {
                return textElement.GetString() ?? string.Empty;
            }

            return string.Empty;
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }

    private static IDictionary<string, string> CreatePolicySnapshot(ToolExecutionContext context)
    {
        if (context.Policy is null)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["slug"] = context.Policy.Slug,
            ["executionMode"] = context.Policy.ExecutionMode,
            ["isExecutionEnabled"] = context.Policy.IsExecutionEnabled.ToString().ToLowerInvariant(),
            ["allowedHttpMethods"] = context.Policy.AllowedHttpMethods.ToString()
        };
    }

    private static IDictionary<string, string> CreateResourceLimits(UniversalToolExecutionRequest request, ToolExecutionContext context)
    {
        var limits = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["timeoutBudgetMs"] = request.TimeoutBudgetMs.ToString(),
            ["capability"] = request.Capability
        };

        if (context.Policy is not null)
        {
            limits["maxInputSize"] = context.Policy.MaxInputSize.ToString();
            limits["maxConcurrency"] = context.Policy.MaxConcurrency.ToString();
            limits["maxRequestsPerMinute"] = context.Policy.MaxRequestsPerMinute.ToString();
        }

        return limits;
    }
}
