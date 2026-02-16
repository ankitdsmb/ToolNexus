using NUglify;
using NUglify.Css;
using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Minifier;

public sealed class MinifierToolExecutor : IToolExecutor
{
    public string Slug => "css-minifier";
    public IReadOnlyCollection<string> SupportedActions { get; } = ["minify", "format"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        var action = request.Options?.GetValueOrDefault("action")?.Trim().ToLowerInvariant() ?? "minify";

        try
        {
            var output = action switch
            {
                "minify" => Minify(request.Input),
                "format" => Format(request.Input),
                _ => throw new NotSupportedException($"Action '{action}' is not supported by {Slug}.")
            };

            return Task.FromResult(ToolResult.Ok(output));
        }
        catch (Exception ex)
        {
            return Task.FromResult(ToolResult.Fail(ex.Message));
        }
    }

    private static string Minify(string input)
    {
        var result = Uglify.Css(input, new CssSettings
        {
            OutputMode = OutputMode.SingleLine,
            CommentMode = CssComment.None
        });

        return EnsureSuccess(result);
    }

    private static string Format(string input)
    {
        var result = Uglify.Css(input, new CssSettings
        {
            OutputMode = OutputMode.MultipleLines,
            CommentMode = CssComment.Important
        });

        return EnsureSuccess(result);
    }

    private static string EnsureSuccess(UglifyResult result)
    {
        if (result.HasErrors)
        {
            var errors = string.Join(" ", result.Errors.Select(error => error.ToString()));
            throw new InvalidOperationException($"CSS processing failed: {errors}");
        }

        return result.Code;
    }
}
