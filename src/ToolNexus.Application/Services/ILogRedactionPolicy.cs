namespace ToolNexus.Application.Services;

public interface ILogRedactionPolicy
{
    string Redact(string fieldName, string value);
    int MaxBodyLoggingSize { get; }
}
