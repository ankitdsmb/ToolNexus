using System.Diagnostics.Metrics;

namespace ToolNexus.Application.Services;

public sealed class AdminControlPlaneTelemetry
{
    private readonly Meter _meter = new("ToolNexus.Admin.ControlPlane");
    private Counter<long>? _operations;

    public Counter<long> Operations => _operations ??= _meter.CreateCounter<long>("admin_controlplane_operation_total", description: "Total admin control plane operations.");
}

