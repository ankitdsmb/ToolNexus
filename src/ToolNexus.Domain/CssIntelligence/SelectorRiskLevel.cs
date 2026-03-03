namespace ToolNexus.Domain.CssIntelligence;

/// <summary>
/// Defines the risk level assigned to a selector based on analysis signals.
/// </summary>
public enum SelectorRiskLevel
{
    /// <summary>
    /// Indicates no meaningful risk was identified.
    /// </summary>
    None,

    /// <summary>
    /// Indicates a low level of potential risk.
    /// </summary>
    Low,

    /// <summary>
    /// Indicates a moderate level of potential risk.
    /// </summary>
    Medium,

    /// <summary>
    /// Indicates a high level of potential risk.
    /// </summary>
    High,
}
