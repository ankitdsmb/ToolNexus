namespace ToolNexus.Application.Services.Pipeline;

public sealed class ToolExecutionContext
{
    public ToolExecutionContext(string toolId, string action, string input)
    {
        ToolId = toolId;
        Action = action;
        Input = input;
    }

    public string ToolId { get; }

    public string Action { get; }

    public string Input { get; }

    public IDictionary<string, object?> Items { get; } = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
}
