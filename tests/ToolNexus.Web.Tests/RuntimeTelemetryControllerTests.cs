using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using ToolNexus.Infrastructure.Options;
using ToolNexus.Web.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class RuntimeTelemetryControllerTests
{
    [Fact]
    public async Task ImportImports_CreatesArtifactAndWritesCounts()
    {
        var rootPath = CreateTempRoot();
        try
        {
            var controller = CreateController(rootPath, isDevelopment: true, allowRuntimeMutation: true);

            var result = await controller.ImportImports(new RuntimeImportTelemetryRequest(["/js/a.js", "/js/b.js", "/js/a.js"]), CancellationToken.None);

            Assert.IsType<OkObjectResult>(result);
            var artifactPath = Path.Combine(rootPath, "artifacts", "runtime-import-usage.json");
            Assert.True(File.Exists(artifactPath));

            var counts = await ReadCountsAsync(artifactPath);
            Assert.Equal(2, counts["/js/a.js"]);
            Assert.Equal(1, counts["/js/b.js"]);
        }
        finally
        {
            Directory.Delete(rootPath, recursive: true);
        }
    }

    [Fact]
    public async Task ImportImports_MergesWithExistingCounts()
    {
        var rootPath = CreateTempRoot();
        try
        {
            var artifactDirectory = Path.Combine(rootPath, "artifacts");
            Directory.CreateDirectory(artifactDirectory);
            var artifactPath = Path.Combine(artifactDirectory, "runtime-import-usage.json");
            await File.WriteAllTextAsync(artifactPath, "{\"/js/a.js\":2}");

            var controller = CreateController(rootPath, isDevelopment: true, allowRuntimeMutation: true);
            var result = await controller.ImportImports(new RuntimeImportTelemetryRequest(["/js/a.js", "/js/c.js"]), CancellationToken.None);

            Assert.IsType<OkObjectResult>(result);
            var counts = await ReadCountsAsync(artifactPath);
            Assert.Equal(3, counts["/js/a.js"]);
            Assert.Equal(1, counts["/js/c.js"]);
        }
        finally
        {
            Directory.Delete(rootPath, recursive: true);
        }
    }

    [Fact]
    public async Task ImportImports_ReturnsNotFoundOutsideDevelopment()
    {
        var rootPath = CreateTempRoot();
        try
        {
            var controller = CreateController(rootPath, isDevelopment: false, allowRuntimeMutation: true);
            var result = await controller.ImportImports(new RuntimeImportTelemetryRequest(["/js/a.js"]), CancellationToken.None);
            Assert.IsType<NotFoundResult>(result);
        }
        finally
        {
            Directory.Delete(rootPath, recursive: true);
        }
    }

    private static RuntimeTelemetryController CreateController(string contentRootPath, bool isDevelopment, bool allowRuntimeMutation)
    {
        return new RuntimeTelemetryController(
            new TestHostEnvironment(contentRootPath, isDevelopment),
            Microsoft.Extensions.Options.Options.Create(new HostingMutationOptions { AllowRuntimeMutation = allowRuntimeMutation }),
            NullLogger<RuntimeTelemetryController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
    }

    private static string CreateTempRoot()
    {
        var path = Path.Combine(Path.GetTempPath(), $"toolnexus-runtime-telemetry-{Guid.NewGuid():N}");
        Directory.CreateDirectory(path);
        return path;
    }

    private static async Task<Dictionary<string, int>> ReadCountsAsync(string artifactPath)
    {
        await using var stream = File.OpenRead(artifactPath);
        return await JsonSerializer.DeserializeAsync<Dictionary<string, int>>(stream)
            ?? new Dictionary<string, int>();
    }

    private sealed class TestHostEnvironment(string contentRootPath, bool isDevelopment) : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = isDevelopment ? "Development" : "Production";
        public string ApplicationName { get; set; } = "ToolNexus.Web.Tests";
        public string WebRootPath { get; set; } = string.Empty;
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = contentRootPath;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
