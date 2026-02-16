using ToolNexus.Tools.Common;

namespace ToolNexus.Api.Infrastructure;

public interface IOrchestrationService
{
    IToolExecutor? SelectToolByCapability(string capabilityTag);
}

public sealed class OrchestrationService(IEnumerable<IToolExecutor> executors) : IOrchestrationService
{
    private readonly IReadOnlyCollection<IToolExecutor> _executors = executors.ToList();

    public IToolExecutor? SelectToolByCapability(string capabilityTag)
    {
        if (string.IsNullOrWhiteSpace(capabilityTag))
        {
            return null;
        }

        return _executors.FirstOrDefault(executor =>
            executor.Metadata.CapabilityTags.Any(tag =>
                string.Equals(tag, capabilityTag, StringComparison.OrdinalIgnoreCase)));
    }
}
