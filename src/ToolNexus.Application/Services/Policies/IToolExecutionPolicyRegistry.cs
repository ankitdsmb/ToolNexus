namespace ToolNexus.Application.Services.Policies;

public interface IToolExecutionPolicyRegistry
{
    Task<IToolExecutionPolicy> GetPolicyAsync(string slug, CancellationToken cancellationToken = default);
}
