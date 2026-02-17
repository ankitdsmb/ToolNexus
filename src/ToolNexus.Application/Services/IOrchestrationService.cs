
using ToolNexus.Application.Abstractions;

namespace ToolNexus.Application.Services;

public interface IOrchestrationService
{
    IToolExecutor? SelectToolByCapability(string capabilityTag);
}
