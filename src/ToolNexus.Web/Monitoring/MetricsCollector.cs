using System.Collections.Concurrent;
using System.Globalization;
using System.Text;

namespace ToolNexus.Web.Monitoring;

public sealed class MetricsCollector : IMetricsCollector
{
    private static readonly double[] DefaultBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

    private readonly Histogram toolInitLatency = new(DefaultBuckets);
    private readonly Histogram manifestLoadDuration = new(DefaultBuckets);
    private readonly Histogram startupPhaseDuration = new(DefaultBuckets);
    private readonly Histogram cssScanDuration = new(DefaultBuckets);
    private long toolMountCount;
    private long toolCrashCount;
    private long cssScanQueueDepth;
    private long cssScanFailureCount;
    private readonly ConcurrentDictionary<string, long> mountsByTool = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, long> crashesByTool = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, Histogram> startupPhaseByName = new(StringComparer.OrdinalIgnoreCase);

    public void ObserveToolInitLatency(double milliseconds, string toolSlug)
    {
        toolInitLatency.Observe(milliseconds);
    }

    public void IncrementToolMount(string toolSlug)
    {
        Interlocked.Increment(ref toolMountCount);
        mountsByTool.AddOrUpdate(toolSlug, 1, static (_, count) => count + 1);
    }

    public void IncrementToolCrash(string toolSlug)
    {
        Interlocked.Increment(ref toolCrashCount);
        crashesByTool.AddOrUpdate(toolSlug, 1, static (_, count) => count + 1);
    }

    public void ObserveManifestLoadDuration(double milliseconds)
    {
        manifestLoadDuration.Observe(milliseconds);
    }

    public void ObserveStartupPhaseDuration(string phaseName, double milliseconds)
    {
        startupPhaseDuration.Observe(milliseconds);
        var phaseHistogram = startupPhaseByName.GetOrAdd(phaseName, static _ => new Histogram(DefaultBuckets));
        phaseHistogram.Observe(milliseconds);
    }

    public void SetCssScanQueueDepth(int depth)
    {
        Interlocked.Exchange(ref cssScanQueueDepth, Math.Max(0, depth));
    }

    public void ObserveCssScanDuration(double milliseconds)
    {
        cssScanDuration.Observe(milliseconds);
    }

    public void IncrementCssScanFailure()
    {
        Interlocked.Increment(ref cssScanFailureCount);
    }

    public string ExportPrometheus()
    {
        var sb = new StringBuilder();

        AppendHistogram(sb, "toolnexus_tool_init_latency_ms", "Tool initialization latency in milliseconds.", toolInitLatency);

        sb.AppendLine("# HELP toolnexus_tool_mount_total Total tool mount attempts.");
        sb.AppendLine("# TYPE toolnexus_tool_mount_total counter");
        sb.AppendLine($"toolnexus_tool_mount_total {Volatile.Read(ref toolMountCount).ToString(CultureInfo.InvariantCulture)}");
        foreach (var mount in mountsByTool.OrderBy(kvp => kvp.Key, StringComparer.OrdinalIgnoreCase))
        {
            sb.AppendLine($"toolnexus_tool_mount_total{{tool_slug=\"{EscapeLabelValue(mount.Key)}\"}} {mount.Value.ToString(CultureInfo.InvariantCulture)}");
        }

        sb.AppendLine("# HELP toolnexus_tool_crash_total Total tool runtime crashes.");
        sb.AppendLine("# TYPE toolnexus_tool_crash_total counter");
        sb.AppendLine($"toolnexus_tool_crash_total {Volatile.Read(ref toolCrashCount).ToString(CultureInfo.InvariantCulture)}");
        foreach (var crash in crashesByTool.OrderBy(kvp => kvp.Key, StringComparer.OrdinalIgnoreCase))
        {
            sb.AppendLine($"toolnexus_tool_crash_total{{tool_slug=\"{EscapeLabelValue(crash.Key)}\"}} {crash.Value.ToString(CultureInfo.InvariantCulture)}");
        }

        AppendHistogram(sb, "toolnexus_manifest_load_duration_ms", "Manifest load duration in milliseconds.", manifestLoadDuration);
        AppendHistogram(sb, "toolnexus_startup_phase_duration_ms", "Startup phase duration in milliseconds.", startupPhaseDuration);
        AppendHistogram(sb, "toolnexus_css_scan_duration_ms", "CSS scan duration in milliseconds.", cssScanDuration);

        sb.AppendLine("# HELP toolnexus_css_scan_queue_depth Current CSS scan queue depth.");
        sb.AppendLine("# TYPE toolnexus_css_scan_queue_depth gauge");
        sb.AppendLine($"toolnexus_css_scan_queue_depth {Volatile.Read(ref cssScanQueueDepth).ToString(CultureInfo.InvariantCulture)}");

        sb.AppendLine("# HELP toolnexus_css_scan_failure_total Total failed CSS scans.");
        sb.AppendLine("# TYPE toolnexus_css_scan_failure_total counter");
        sb.AppendLine($"toolnexus_css_scan_failure_total {Volatile.Read(ref cssScanFailureCount).ToString(CultureInfo.InvariantCulture)}");

        foreach (var phase in startupPhaseByName.OrderBy(kvp => kvp.Key, StringComparer.OrdinalIgnoreCase))
        {
            AppendHistogram(sb, "toolnexus_startup_phase_duration_by_phase_ms", "Startup phase duration in milliseconds by phase.", phase.Value, phase.Key);
        }

        return sb.ToString();
    }

    private static void AppendHistogram(StringBuilder sb, string name, string helpText, Histogram histogram, string? phaseName = null)
    {
        sb.AppendLine($"# HELP {name} {helpText}");
        sb.AppendLine($"# TYPE {name} histogram");

        var snapshot = histogram.Snapshot();
        foreach (var bucket in snapshot.Buckets)
        {
            var labels = phaseName is null
                ? $"le=\"{bucket.UpperBound}\""
                : $"phase=\"{EscapeLabelValue(phaseName)}\",le=\"{bucket.UpperBound}\"";
            sb.AppendLine($"{name}_bucket{{{labels}}} {bucket.Count.ToString(CultureInfo.InvariantCulture)}");
        }

        var infLabels = phaseName is null
            ? "le=\"+Inf\""
            : $"phase=\"{EscapeLabelValue(phaseName)}\",le=\"+Inf\"";
        sb.AppendLine($"{name}_bucket{{{infLabels}}} {snapshot.Count.ToString(CultureInfo.InvariantCulture)}");

        var sumLabels = phaseName is null
            ? string.Empty
            : $"{{phase=\"{EscapeLabelValue(phaseName)}\"}}";
        sb.AppendLine($"{name}_sum{sumLabels} {snapshot.Sum.ToString(CultureInfo.InvariantCulture)}");
        sb.AppendLine($"{name}_count{sumLabels} {snapshot.Count.ToString(CultureInfo.InvariantCulture)}");
    }

    private static string EscapeLabelValue(string input) => input.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal);

    private sealed class Histogram
    {
        private readonly double[] buckets;
        private readonly long[] bucketCounts;
        private double sum;
        private long count;

        public Histogram(double[] buckets)
        {
            this.buckets = buckets.OrderBy(static x => x).ToArray();
            bucketCounts = new long[this.buckets.Length];
        }

        public void Observe(double value)
        {
            var normalized = Math.Max(0d, value);
            Interlocked.Increment(ref count);
            AddDouble(ref sum, normalized);

            for (var i = 0; i < buckets.Length; i++)
            {
                if (normalized <= buckets[i])
                {
                    Interlocked.Increment(ref bucketCounts[i]);
                }
            }
        }

        public HistogramSnapshot Snapshot()
        {
            var bucketSnapshot = new List<HistogramBucket>(buckets.Length);
            for (var i = 0; i < buckets.Length; i++)
            {
                bucketSnapshot.Add(new HistogramBucket(buckets[i].ToString(CultureInfo.InvariantCulture), Volatile.Read(ref bucketCounts[i])));
            }

            return new HistogramSnapshot(bucketSnapshot, Volatile.Read(ref count), Volatile.Read(ref sum));
        }

        private static void AddDouble(ref double target, double value)
        {
            double original;
            double updated;
            do
            {
                original = target;
                updated = original + value;
            }
            while (Interlocked.CompareExchange(ref target, updated, original) != original);
        }
    }

    private sealed record HistogramBucket(string UpperBound, long Count);
    private sealed record HistogramSnapshot(IReadOnlyList<HistogramBucket> Buckets, long Count, double Sum);
}
