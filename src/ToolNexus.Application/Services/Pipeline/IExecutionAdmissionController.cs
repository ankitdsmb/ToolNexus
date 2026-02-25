using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IExecutionAdmissionController
{
    ExecutionAdmissionDecision Evaluate(ExecutionSnapshot snapshot, ToolExecutionContext context);
}
