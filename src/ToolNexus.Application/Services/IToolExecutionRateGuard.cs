namespace ToolNexus.Application.Services;

public interface IToolExecutionRateGuard
{
    bool TryAcquire(string slug, int maxRequestsPerMinute);
}
