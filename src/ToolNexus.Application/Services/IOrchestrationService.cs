using ToolNexus.Domain;

namespace ToolNexus.Application.Services;

public interface IOrchestrationService
{
    IToolExecutor? SelectToolByCapability(string capabilityTag);
}
