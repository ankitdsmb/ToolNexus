using System.Text.Json;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;

namespace ToolNexus.Api.Logging;

public sealed class RuntimeClientLoggerService(
    IOptionsMonitor<ToolNexusLoggingOptions> loggingOptions,
    ILogger<RuntimeClientLoggerService> logger) : IRuntimeClientLoggerService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly SemaphoreSlim WriteLock = new(1, 1);

    public async Task WriteBatchAsync(ClientIncidentLogBatch batch, CancellationToken cancellationToken)
    {
        var options = loggingOptions.CurrentValue;
        if (!options.EnableClientIncidents || batch.Logs.Count == 0)
        {
            return;
        }

        Directory.CreateDirectory("/logs");
        var logPath = "/logs/runtime.log";

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
                    message = entry.Message,
                    toolSlug = entry.ToolSlug,
                    correlationId = entry.CorrelationId,
                    timestamp = entry.Timestamp == default ? DateTime.UtcNow : entry.Timestamp,
                    metadata = entry.Metadata
                }, JsonOptions);
                await writer.WriteLineAsync(line);
            }

            await writer.FlushAsync(cancellationToken);
        }
        finally
        {
            WriteLock.Release();
        }

        logger.LogDebug("Runtime client log batch persisted. Count: {Count}", batch.Logs.Count);
    }
}
