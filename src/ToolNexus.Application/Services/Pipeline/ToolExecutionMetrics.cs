using System.Diagnostics.Metrics;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class ToolExecutionMetrics
{
    public const string MeterName = "ToolNexus.ToolExecution";
    private readonly Meter _meter = new(MeterName);
    public Counter<long> Requests => _requests ??= _meter.CreateCounter<long>("tool_requests_total");
    public Counter<long> Errors => _errors ??= _meter.CreateCounter<long>("tool_errors_total");
    public Counter<long> Timeouts => _timeouts ??= _meter.CreateCounter<long>("tool_timeouts_total");
    public Histogram<double> LatencyMs => _latency ??= _meter.CreateHistogram<double>("tool_latency_ms");
    public Counter<long> CacheHits => _cacheHits ??= _meter.CreateCounter<long>("tool_cache_hits_total");
    private Counter<long>? _requests;
    private Counter<long>? _errors;
    private Counter<long>? _timeouts;
    private Histogram<double>? _latency;
    private Counter<long>? _cacheHits;
}
