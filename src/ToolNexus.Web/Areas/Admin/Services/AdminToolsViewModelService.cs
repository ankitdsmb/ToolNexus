using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Models;

namespace ToolNexus.Web.Areas.Admin.Services;

public sealed class AdminToolsViewModelService(IToolDefinitionService service, IExecutionPolicyService executionPolicyService) : IAdminToolsViewModelService
{
    public async Task<ToolAdminIndexViewModel> BuildAsync(ToolAdminFormModel form, CancellationToken cancellationToken)
        => new()
        {
            Tools = await service.GetListAsync(cancellationToken),
            Form = form
        };

    public async Task<ToolAdminFormModel?> BuildFormForEditAsync(int id, CancellationToken cancellationToken)
    {
        var detail = await service.GetByIdAsync(id, cancellationToken);
        if (detail is null)
        {
            return null;
        }

        var form = ToolAdminFormModel.FromDetail(detail);
        var policy = await executionPolicyService.GetBySlugAsync(detail.Slug, cancellationToken);
        form.ExecutionMode = policy.ExecutionMode;
        form.TimeoutSeconds = policy.TimeoutSeconds;
        form.MaxRequestsPerMinute = policy.MaxRequestsPerMinute;
        form.MaxInputSize = policy.MaxInputSize;
        form.IsExecutionEnabled = policy.IsExecutionEnabled;
        return form;
    }
}
