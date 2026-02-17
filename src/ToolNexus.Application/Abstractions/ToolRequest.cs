namespace ToolNexus.Application.Abstractions;

public sealed record ToolRequest
{
    public ToolRequest(string action, string input, IDictionary<string, string>? options = null)
    {
        if (string.IsNullOrWhiteSpace(action))
        {
            throw new ArgumentException("Action is required.", nameof(action));
        }

        if (input is null)
        {
            throw new ArgumentNullException(nameof(input));
        }

        Action = action;
        Input = input;
        Options = options;
    }

    public string Action { get; }

    public string Input { get; }

    public IDictionary<string, string>? Options { get; }
}
