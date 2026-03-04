using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Controllers.Api;
using ToolNexus.Web.Security;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class CssAnalyzerControllerTests
{
    [Fact]
    public async Task Analyze_WithValidUrl_ReturnsOkWithPendingJob()
    {
        await using var dbContext = CreateDbContext();
        var controller = CreateController(dbContext);

        var result = await controller.Analyze(new CssAnalyzerController.CssAnalyzeRequest("https://example.com"), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = ToJsonObject(ok.Value);
        Assert.True(Guid.TryParse(payload["jobId"]?.GetValue<string>(), out var jobId));
        Assert.NotEqual(Guid.Empty, jobId);
        Assert.Equal("Pending", payload["status"]?.GetValue<string>());
        Assert.Single(dbContext.CssScanJobs);
    }

    [Fact]
    public async Task Analyze_WithInvalidUrl_ReturnsBadRequest()
    {
        await using var dbContext = CreateDbContext();
        var controller = CreateController(dbContext);

        var result = await controller.Analyze(new CssAnalyzerController.CssAnalyzeRequest("javascript:alert('xss')"), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var payload = ToJsonObject(badRequest.Value);
        Assert.False(string.IsNullOrWhiteSpace(payload["error"]?.GetValue<string>()));
    }

    private static JsonObject ToJsonObject(object? value)
        => Assert.IsType<JsonObject>(JsonSerializer.SerializeToNode(value));

    private static ToolNexusContentDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ToolNexusContentDbContext>()
            .UseInMemoryDatabase($"css-analyzer-tests-{Guid.NewGuid()}")
            .Options;

        return new ToolNexusContentDbContext(options);
    }

    private static CssAnalyzerController CreateController(ToolNexusContentDbContext dbContext)
        => new(dbContext, new UrlSecurityValidator(), NullLogger<CssAnalyzerController>.Instance);
}
