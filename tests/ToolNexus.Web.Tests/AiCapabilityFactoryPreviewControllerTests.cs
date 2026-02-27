using Xunit;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Controllers;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Tests;

public sealed class AiCapabilityFactoryPreviewControllerTests
{
    [Fact]
    public async Task Preview_KnownSlug_RendersToolShellAsAdminPreview()
    {
        var controller = new AiCapabilityFactoryController(new StubImportService());

        var result = await controller.Preview("draft-tool", CancellationToken.None);

        var view = Assert.IsType<ViewResult>(result);
        Assert.Equal("~/Views/Tools/ToolShell.cshtml", view.ViewName);
        var model = Assert.IsType<ToolPageViewModel>(view.Model);
        Assert.True(model.IsAdminPreview);
        Assert.Contains("/manifest", model.ManifestEndpoint);
    }

    private sealed class StubImportService : IAiToolPackageImportService
    {
        public Task<AiToolPackageRecord> CreateDraftAsync(AiToolPackageImportRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<AiToolPackageContract?> GetContractBySlugAsync(string slug, CancellationToken cancellationToken)
            => Task.FromResult<AiToolPackageContract?>(new AiToolPackageContract("v1", slug, "{}", "{}", "{}", "{}", [new AiToolVirtualFile("tool.js", "js", "export default {}")], "{}"));
        public AiToolPackageTemplateResponse GetTemplate() => throw new NotImplementedException();
        public Task<AiToolPackageImportValidationResult> ValidateAsync(string jsonPayload, CancellationToken cancellationToken) => throw new NotImplementedException();
    }
}
