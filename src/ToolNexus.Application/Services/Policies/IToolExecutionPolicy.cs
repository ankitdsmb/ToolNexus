namespace ToolNexus.Application.Services.Policies;

public interface IToolExecutionPolicy
{
    string Slug { get; }
    string ExecutionMode { get; }
    bool IsExecutionEnabled { get; }
    int TimeoutSeconds { get; }
    int MaxInputSize { get; }
    int MaxRequestsPerMinute { get; }
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
