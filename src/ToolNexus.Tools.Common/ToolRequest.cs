using System.ComponentModel.DataAnnotations;

namespace ToolNexus.Tools.Common;

public sealed record ToolRequest(
    [property: Required(AllowEmptyStrings = false)]
    [property: MinLength(1)]
    string Input,
    IDictionary<string, string>? Options = null);
