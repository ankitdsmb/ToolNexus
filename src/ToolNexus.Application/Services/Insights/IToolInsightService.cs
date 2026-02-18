using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Insights;

public interface IToolInsightService
{
    ToolInsightResult? GetInsight(
        string slug,
        string action,
        string input,
        string? error,
        IDictionary<string, string>? options);
}
