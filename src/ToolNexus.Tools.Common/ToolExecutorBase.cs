namespace ToolNexus.Tools.Common;

public abstract class ToolExecutorBase : IToolExecutor
{
    public abstract string Slug { get; }

    public abstract IReadOnlyCollection<string> SupportedActions { get; }

    protected virtual string DefaultAction => SupportedActions.First();

    public async Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var action = ResolveAction(request);

            if (!IsSupportedAction(action))
            {
                return ToolResult.Fail($"Action '{action}' is not supported by {Slug}.");
            }

            var output = await ExecuteActionAsync(action, request, cancellationToken);
            return ToolResult.Ok(output);
        }
        catch (Exception ex)
        {
            return ToolResult.Fail(ex.Message);
        }
    }

    protected abstract Task<string> ExecuteActionAsync(string action, ToolRequest request, CancellationToken cancellationToken);

    protected virtual string ResolveAction(ToolRequest request)
    {
        var action = request.Options?.GetValueOrDefault("action");
        return string.IsNullOrWhiteSpace(action) ? DefaultAction : action.Trim();
    }

    protected virtual bool IsSupportedAction(string action)
    {
        return SupportedActions.Contains(action, StringComparer.OrdinalIgnoreCase);
    }
}
