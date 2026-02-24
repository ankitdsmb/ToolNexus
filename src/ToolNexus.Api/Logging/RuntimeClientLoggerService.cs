using System.Text.Json;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;

namespace ToolNexus.Api.Logging;

public sealed class RuntimeClientLoggerService(
    IOptionsMonitor<ToolNexusLoggingOptions> loggingOptions,
    ILoggerFactory loggerFactory) : IRuntimeClientLoggerService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly SemaphoreSlim WriteLock = new(1, 1);
    private static int _warningEmitted;
    private readonly ILogger _logger = loggerFactory.CreateLogger(LoggingCategories.RuntimeIncidentLogger);

    public async Task WriteBatchAsync(ClientIncidentLogBatch batch, CancellationToken cancellationToken)
    {
        var options = loggingOptions.CurrentValue;
        if (!options.EnableRuntimeLogCapture || batch.Logs.Count == 0)
        {
            return;
        }

        var logPath = Path.Combine("logs", "runtime", $"runtime-{DateTime.UtcNow:yyyy-MM-dd}.log");

        if (!TryEnsureDirectory())
        {
            EmitWarningOnce("Runtime log folder unavailable. Falling back to console logging.");
            foreach (var entry in batch.Logs)
            {
                _logger.LogWarning("Runtime client log (console fallback) {Level} {Message}", entry.Level, Truncate(entry.Message, 512));
            }

            return;
        }

        await WriteLock.WaitAsync(cancellationToken);
        try
        {
            await using var stream = new FileStream(logPath, FileMode.Append, FileAccess.Write, FileShare.ReadWrite);
            await using var writer = new StreamWriter(stream);
            foreach (var entry in batch.Logs)
            {
                if (!options.RuntimeDebugEnabled && string.Equals(entry.Level, "debug", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var line = JsonSerializer.Serialize(new
                {
                    type = "client-runtime-log",
                    source = entry.Source,
                    level = entry.Level,
                    message = Truncate(entry.Message, 1200),
                    stack = Truncate(entry.Stack, 4000),
                    toolSlug = Truncate(entry.ToolSlug, 120),
                    correlationId = entry.CorrelationId,
                    timestamp = entry.Timestamp == default ? DateTime.UtcNow : entry.Timestamp,
                    metadata = SerializeMetadata(entry.Metadata)
                }, JsonOptions);
                await writer.WriteLineAsync(line);
            }

            await writer.FlushAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            EmitWarningOnce($"Runtime file log write failed. Falling back to console logging. Reason: {ex.GetType().Name}");
            _logger.LogWarning(ex, "Runtime client log write failed.");
        }
        finally
        {
            WriteLock.Release();
        }

        _logger.LogDebug("Runtime client log batch persisted. Count: {Count}", batch.Logs.Count);
    }

    private static bool TryEnsureDirectory()
    {
        try
        {
            Directory.CreateDirectory(Path.Combine("logs", "runtime"));
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string Truncate(string? value, int maxLength)
    {
        var safe = value ?? string.Empty;
        return safe.Length <= maxLength ? safe : safe[..maxLength];
    }

    private static string SerializeMetadata(IReadOnlyDictionary<string, object?>? metadata)
    {
        if (metadata is null || metadata.Count == 0)
        {
            return string.Empty;
        }

        var serialized = JsonSerializer.Serialize(metadata, JsonOptions);
        return Truncate(serialized, 2000);
    }

    private static void EmitWarningOnce(string message)
    {
        if (Interlocked.Exchange(ref _warningEmitted, 1) == 1)
        {
            return;
        }

        Console.Error.WriteLine($"[WARN] {message}");
    }
}
