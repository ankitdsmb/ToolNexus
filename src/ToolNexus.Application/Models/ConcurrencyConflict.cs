namespace ToolNexus.Application.Models;

public sealed record ConcurrencyConflict(
    string Error,
    string Resource,
    string ResourceId,
    string? ClientVersionToken,
    string? ServerVersionToken,
    object? ServerState,
    IReadOnlyCollection<string> ChangedFields,
    string Message)
{
    public static ConcurrencyConflictEnvelope ToEnvelope(ConcurrencyConflict conflict)
        => new(
            conflict.Error,
            conflict.Resource,
            conflict.ClientVersionToken,
            conflict.ServerVersionToken,
            conflict.ServerState,
            conflict.ChangedFields,
            conflict.Message);
}

public sealed record ConcurrencyConflictEnvelope(
    string Error,
    string Resource,
    string? ClientVersionToken,
    string? ServerVersionToken,
    object? ServerState,
    IReadOnlyCollection<string> ChangedFields,
    string Message);

public sealed class ConcurrencyConflictException(ConcurrencyConflict conflict) : Exception(conflict.Message)
{
    public ConcurrencyConflict Conflict { get; } = conflict;
}

public sealed class OptimisticConcurrencyException(string? clientVersionToken, Exception? innerException = null) : Exception("Optimistic concurrency conflict detected.", innerException)
{
    public string? ClientVersionToken { get; } = clientVersionToken;
}
