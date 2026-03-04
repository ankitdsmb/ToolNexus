namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class CssSelectorMetric
{
    public Guid Id { get; set; }
    public Guid ResultId { get; set; }
    public required string Selector { get; set; }
    public bool IsUsed { get; set; }

    public CssScanResult? Result { get; set; }
}
