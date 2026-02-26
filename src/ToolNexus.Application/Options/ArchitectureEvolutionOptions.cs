namespace ToolNexus.Application.Options;

public sealed class ArchitectureEvolutionOptions
{
    public const string SectionName = "ArchitectureEvolution";

    public decimal DriftDetectionThreshold { get; set; } = 0.7m;

    public decimal RecommendationConfidenceThreshold { get; set; } = 0.65m;

    public int LookbackHours { get; set; } = 168;
}
