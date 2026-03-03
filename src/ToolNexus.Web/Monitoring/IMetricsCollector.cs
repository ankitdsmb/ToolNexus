namespace ToolNexus.Web.Monitoring;

public interface IMetricsCollector
{
    void ObserveToolInitLatency(double milliseconds, string toolSlug);
    void IncrementToolMount(string toolSlug);
    void IncrementToolCrash(string toolSlug);
    void ObserveManifestLoadDuration(double milliseconds);
    void ObserveStartupPhaseDuration(string phaseName, double milliseconds);
    string ExportPrometheus();
}
