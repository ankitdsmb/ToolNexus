using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Web.Controllers.Api;

[ApiController]
[Route("api/runtime-telemetry")]
public sealed class RuntimeTelemetryController(
    IWebHostEnvironment environment,
    IOptions<HostingMutationOptions> hostingMutationOptions,
    ILogger<RuntimeTelemetryController> logger) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    private static readonly SemaphoreSlim FileLock = new(1, 1);

    [HttpPost("imports")]
    public async Task<IActionResult> ImportImports([FromBody] RuntimeImportTelemetryRequest? request, CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment() || !hostingMutationOptions.Value.AllowRuntimeMutation)
        {
            return NotFound();
        }

        if (request is null || request.Imports is null)
        {
            return BadRequest(new { error = "Payload must be an object with an imports array." });
        }

        var normalizedImports = request.Imports
            .Where(static value => !string.IsNullOrWhiteSpace(value))
            .Select(static value => value.Trim())
            .ToArray();

        if (normalizedImports.Length == 0)
        {
            return BadRequest(new { error = "imports must contain at least one non-empty string value." });
        }

        var artifactDirectory = Path.Combine(environment.ContentRootPath, "artifacts");
        var artifactPath = Path.Combine(artifactDirectory, "runtime-import-usage.json");

        await FileLock.WaitAsync(cancellationToken);

        try
        {
            Directory.CreateDirectory(artifactDirectory);

            var importCounts = await LoadImportCountsAsync(artifactPath, cancellationToken);
            foreach (var importPath in normalizedImports)
            {
                if (importCounts.TryGetValue(importPath, out var existingCount))
                {
                    importCounts[importPath] = existingCount + 1;
                }
                else
                {
                    importCounts[importPath] = 1;
                }
            }

            await using var stream = System.IO.File.Create(artifactPath);
            await JsonSerializer.SerializeAsync(stream, importCounts, JsonOptions, cancellationToken);

            return Ok(new
            {
                importsRecorded = normalizedImports.Length,
                uniqueImportsTracked = importCounts.Count
            });
        }
        finally
        {
            FileLock.Release();
        }
    }

    private async Task<Dictionary<string, int>> LoadImportCountsAsync(string artifactPath, CancellationToken cancellationToken)
    {
        if (!System.IO.File.Exists(artifactPath))
        {
            return new Dictionary<string, int>(StringComparer.Ordinal);
        }

        try
        {
            await using var stream = System.IO.File.OpenRead(artifactPath);
            var existingCounts = await JsonSerializer.DeserializeAsync<Dictionary<string, int>>(stream, cancellationToken: cancellationToken);
            return existingCounts ?? new Dictionary<string, int>(StringComparer.Ordinal);
        }
        catch (Exception ex) when (ex is JsonException or IOException)
        {
            logger.LogWarning(ex, "Runtime telemetry imports artifact was unreadable; starting with empty counts.");
            return new Dictionary<string, int>(StringComparer.Ordinal);
        }
    }
}

public sealed record RuntimeImportTelemetryRequest(string[]? Imports);
