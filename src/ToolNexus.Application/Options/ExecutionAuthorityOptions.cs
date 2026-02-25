namespace ToolNexus.Application.Options;

public sealed class ExecutionAuthorityOptions
{
    public const string SectionName = "ExecutionAuthority";

    public bool EnableShadowMode { get; set; }
    public bool EnableUnifiedAuthority { get; set; }

    public string[] ShadowLanguages { get; set; } = [];
    public string[] UnifiedAuthorityLanguages { get; set; } = [];
    public string[] ShadowCapabilities { get; set; } = [];
    public string[] UnifiedAuthorityCapabilities { get; set; } = [];
    public string[] ShadowRiskTiers { get; set; } = [];

    public string RiskTierOptionKey { get; set; } = "riskTier";
}
