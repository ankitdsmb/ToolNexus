namespace ToolNexus.Application.Services.Policies;

public interface IToolExecutionPolicy
{
    string Slug { get; }
    int TimeoutSeconds { get; }
    int MaxPayloadSizeBytes { get; }
    int CacheTtlSeconds { get; }
    ToolHttpMethodPolicy AllowedHttpMethods { get; }
    bool AllowAnonymous { get; }
    int MaxConcurrency { get; }
    int RetryCount { get; }
    int CircuitBreakerFailureThreshold { get; }
}

[Flags]
public enum ToolHttpMethodPolicy
{
    None = 0,
    Get = 1,
    Post = 2,
    GetOrPost = Get | Post
}
