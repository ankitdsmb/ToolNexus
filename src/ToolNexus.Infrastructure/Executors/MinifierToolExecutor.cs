using NUglify;
using NUglify.Css;
using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public sealed class MinifierToolExecutor : ToolExecutorBase
{
    public override string Slug => "css-minifier";
    public override ToolMetadata Metadata { get; } = new(
        "CSS Minifier",
        "Minify or format CSS stylesheets.",
        "minify",
        "body { color: #fff; }",
        ["css", "minification", "formatting"]);

    public override IReadOnlyCollection<string> SupportedActions { get; } = ["minify", "format"];

    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        var output = action switch
        {
            "minify" => MinifyCss(request.Input),
            "format" => FormatCss(request.Input),
            _ => throw new InvalidOperationException($"Unsupported action: {action}")
        };

        return Task.FromResult(output);
    }

    private static ToolResult MinifyCss(string input)
    {
        var result = Uglify.Css(input, CssSettingsForMinify());
        if (result.HasErrors)
        {
            return ToolResult.Fail(FormatErrors(result.Errors));
        }

        return ToolResult.Ok(result.Code);
    }

    private static ToolResult FormatCss(string input)
    {
        var result = Uglify.Css(input, CssSettingsForFormat());
        if (result.HasErrors)
        {
            return ToolResult.Fail(FormatErrors(result.Errors));
        }

        return ToolResult.Ok(result.Code);
    }

    private static CssSettings CssSettingsForMinify() => new()
    {
        CommentMode = CssComment.None,
        MinifyExpressions = true,
        ColorNames = CssColor.Hex,
        OutputMode = OutputMode.SingleLine
    };

    private static CssSettings CssSettingsForFormat() => new()
    {
        CommentMode = CssComment.Important,
        MinifyExpressions = false,
        ColorNames = CssColor.Strict,
        OutputMode = OutputMode.MultipleLines
    };

    private static string FormatErrors(IList<UglifyError> errors)
    {
        var firstError = errors.FirstOrDefault();
        if (firstError is null)
        {
            return "CSS parsing failed.";
        }

        return $"CSS parsing failed at line {firstError.StartLine}, column {firstError.StartColumn}: {firstError.Message}";
    }
}
