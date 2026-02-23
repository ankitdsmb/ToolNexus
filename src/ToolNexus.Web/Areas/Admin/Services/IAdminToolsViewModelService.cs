using ToolNexus.Web.Areas.Admin.Models;

namespace ToolNexus.Web.Areas.Admin.Services;

public interface IAdminToolsViewModelService
{
    Task<ToolAdminIndexViewModel> BuildAsync(ToolAdminFormModel form, CancellationToken cancellationToken);
    Task<ToolAdminFormModel?> BuildFormForEditAsync(int id, CancellationToken cancellationToken);
}
