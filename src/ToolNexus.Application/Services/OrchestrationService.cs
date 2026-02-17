using ToolNexus.Application.Abstractions;

namespace ToolNexus.Application.Services;

public sealed class OrchestrationService(IEnumerable<IToolExecutor> executors) : IOrchestrationService
{
    public IToolExecutor? SelectToolByCapability(string capabilityTag)
    {
        if (string.IsNullOrWhiteSpace(capabilityTag))
        {
            return null;
        }

        var normalizedCapability = capabilityTag.Trim();

        return executors.FirstOrDefault(executor =>
            executor.Metadata.CapabilityTags.Any(tag => tag.Equals(normalizedCapability, StringComparison.OrdinalIgnoreCase)));
    }
}
