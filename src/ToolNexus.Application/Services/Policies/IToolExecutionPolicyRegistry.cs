namespace ToolNexus.Application.Services.Policies;

public interface IToolExecutionPolicyRegistry
{
    IToolExecutionPolicy GetPolicy(string slug);
}
