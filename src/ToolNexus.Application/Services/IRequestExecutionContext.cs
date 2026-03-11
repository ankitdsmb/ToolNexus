namespace ToolNexus.Application.Services;

public interface IRequestExecutionContext
{
    string? Method { get; }
    string? ApiKey { get; }
}

public sealed class NullRequestExecutionContext : IRequestExecutionContext
{
    public string? Method => null;
    public string? ApiKey => null;
}
