using Microsoft.Extensions.Configuration;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Security;

public sealed class LogRedactionPolicy(IConfiguration configuration) : ILogRedactionPolicy
{
    private readonly HashSet<string> _fields = configuration.GetSection("Security:Logging:RedactedFields").Get<string[]>()?.ToHashSet(StringComparer.OrdinalIgnoreCase)
        ?? new HashSet<string>(["apikey", "authorization", "password"], StringComparer.OrdinalIgnoreCase);

    public int MaxBodyLoggingSize => configuration.GetValue("Security:Logging:MaxBodyLoggingSize", 2048);

    public string Redact(string fieldName, string value)
        => _fields.Contains(fieldName) ? "***REDACTED***" : value;
}
