using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Insights;

public interface IToolInsightProvider
{
    string ToolSlug { get; }

    ToolInsightResult? GenerateInsight(
        string action,
        string input,
        string? error,
        IDictionary<string, string>? options);
}
