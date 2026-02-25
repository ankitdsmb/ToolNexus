using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class DefaultExecutionConformanceValidator : IExecutionConformanceValidator
{
    private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Succeeded",
        "Failed",
        "Canceled",
        "TimedOut"
    };

    public ExecutionConformanceResult Validate(UniversalToolExecutionResult result, UniversalToolExecutionRequest request)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentNullException.ThrowIfNull(request);

        var issues = new List<string>();
        var wasNormalized = false;
        var isValid = true;

        var normalizedStatus = result.Status;
        if (string.IsNullOrWhiteSpace(normalizedStatus))
        {
            normalizedStatus = "Failed";
            issues.Add("Missing status normalized to Failed.");
            wasNormalized = true;
            isValid = false;
        }
        else if (!ValidStatuses.Contains(normalizedStatus))
        {
            normalizedStatus = "Failed";
            issues.Add("Unknown status normalized to Failed.");
            wasNormalized = true;
            isValid = false;
        }

        var normalizedMetrics = result.Metrics;
        if (normalizedMetrics is null)
        {
            normalizedMetrics = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            issues.Add("Missing metrics object created.");
            wasNormalized = true;
            isValid = false;
        }

        var normalizedIncidents = result.Incidents;
        if (normalizedIncidents is null)
        {
            normalizedIncidents = Array.Empty<string>();
            issues.Add("Missing incidents list initialized.");
            wasNormalized = true;
            isValid = false;
        }

        var normalizedResult = result with
        {
            Status = normalizedStatus,
            Metrics = normalizedMetrics,
            Incidents = normalizedIncidents
        };

        return new ExecutionConformanceResult(
            IsValid: isValid,
            NormalizedStatus: normalizedStatus,
            ConformanceIssues: issues,
            WasNormalized: wasNormalized,
            NormalizedResult: normalizedResult);
    }
}
