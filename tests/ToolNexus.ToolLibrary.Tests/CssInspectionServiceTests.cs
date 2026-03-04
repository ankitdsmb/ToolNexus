using ToolNexus.ToolLibrary;

namespace ToolNexus.ToolLibrary.Tests;

public sealed class CssInspectionServiceTests
{
    private readonly CssInspectionService _service = new();

    [Fact]
    public void DetectsUsedSelectors()
    {
        var result = _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = "<div class='used'></div>",
            CssContent = ".used { color: red; } .unused { color: blue; }"
        });

        Assert.Contains(".used", result.UsedSelectors);
    }

    [Fact]
    public void DetectsUnusedSelectors()
    {
        var result = _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = "<div class='used'></div>",
            CssContent = ".used { color: red; } .unused { color: blue; }"
        });

        Assert.Contains(".unused", result.UnusedSelectors);
    }

    [Fact]
    public void DetectsDuplicateSelectors()
    {
        var result = _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = "<div class='dup'></div>",
            CssContent = ".dup { color: red; } .dup { color: blue; }"
        });

        Assert.Contains(".dup", result.DuplicateSelectors);
    }

    [Fact]
    public void DetectsKeyframes()
    {
        var result = _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = "<div class='a'></div>",
            CssContent = "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .a { animation: fadeIn 1s; }"
        });

        Assert.Contains("fadeIn", result.Keyframes);
    }

    [Fact]
    public void DetectsFontFaceDeclarations()
    {
        var result = _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = "<p class='copy'>hello</p>",
            CssContent = "@font-face { font-family: Test; src: url('font.woff2'); } .copy { font-family: Test; }"
        });

        Assert.Equal(1, result.FontFaceCount);
    }

    [Fact]
    public void CalculatesConfidenceScoreCorrectly()
    {
        var result = _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = "<div class='a'></div>",
            CssContent = ".a{} .b{} .a{}",
            Mode = CssAnalysisMode.Safe
        });

        Assert.Equal(0.4, result.ConfidenceScore);
    }

    [Fact]
    public void UsesDifferentBehaviorInSafeVsAggressiveMode()
    {
        const string html = "<main id='hero'><div class='box'></div></main>";
        const string css = "main { padding: 0; } #hero { margin: 0; } .box { color: red; }";

        var safe = _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = html,
            CssContent = css,
            Mode = CssAnalysisMode.Safe
        });

        var aggressive = _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = html,
            CssContent = css,
            Mode = CssAnalysisMode.Aggressive
        });

        Assert.DoesNotContain("#hero", safe.UsedSelectors);
        Assert.Contains("#hero", aggressive.UsedSelectors);
    }

    [Fact]
    public void ProducesDeterministicOutput()
    {
        var request = new CssInspectionRequest
        {
            HtmlContent = "<div class='one'></div>",
            CssContent = ".two{} .one{} .three{}"
        };

        var first = _service.Analyze(request);
        var second = _service.Analyze(request);

        Assert.Equal(first.UsedSelectors, second.UsedSelectors);
        Assert.Equal(first.UnusedSelectors, second.UnusedSelectors);
        Assert.Equal(first.DuplicateSelectors, second.DuplicateSelectors);
        Assert.Equal(first.Keyframes, second.Keyframes);
        Assert.Equal(first.FontFaceCount, second.FontFaceCount);
        Assert.Equal(first.ConfidenceScore, second.ConfidenceScore);
    }

    [Fact]
    public void BlocksPotentialSsrfTargets()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = "<div class='a'></div>",
            CssContent = ".a{}",
            CssUrl = "http://127.0.0.1/internal.css"
        }));

        Assert.Contains("SSRF", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EnforcesContentSizeLimits()
    {
        var ex = Assert.Throws<ArgumentException>(() => _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = new string('h', 40),
            CssContent = ".a{}",
            MaxInputLength = 20
        }));

        Assert.Contains("exceeds", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void SupportsCancellation()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        Assert.Throws<OperationCanceledException>(() => _service.Analyze(new CssInspectionRequest
        {
            HtmlContent = "<div class='a'></div>",
            CssContent = ".a{}"
        }, cts.Token));
    }
}
