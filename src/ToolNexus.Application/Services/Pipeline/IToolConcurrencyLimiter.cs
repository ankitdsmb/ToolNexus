namespace ToolNexus.Application.Services.Pipeline;

public interface IToolConcurrencyLimiter
{
    ValueTask<IDisposable> AcquireAsync(string slug, int maxConcurrency, CancellationToken cancellationToken);
}
