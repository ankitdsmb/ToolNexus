using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/ai-capability-factory")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class AiCapabilityFactoryController(IAiCapabilityFactoryService service) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<AiCapabilityFactoryDashboard>> GetDashboard([FromQuery] int take = 50, CancellationToken cancellationToken = default)
        => Ok(await service.GetDashboardAsync(take, cancellationToken));

    [HttpPost("drafts")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AiToolGenerationDraftRecord>> CreateDraft([FromBody] AiDraftGenerationRequest request, CancellationToken cancellationToken)
        => Ok(await service.CreateDraftAsync(request, cancellationToken));

    [HttpPost("drafts/{draftId:guid}/validate")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AiGenerationValidationReportRecord>> Validate(Guid draftId, [FromQuery] string correlationId, [FromQuery] string tenantId, CancellationToken cancellationToken)
        => Ok(await service.ValidateDraftAsync(draftId, correlationId, tenantId, cancellationToken));

    [HttpPost("drafts/{draftId:guid}/governance")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AiGenerationDecisionRecord>> GovernanceDecision(Guid draftId, [FromBody] AiGenerationDecisionRequest request, CancellationToken cancellationToken)
        => Ok(await service.RecordGovernanceDecisionAsync(draftId, request, cancellationToken));

    [HttpPost("drafts/{draftId:guid}/sandbox")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AiGenerationSandboxReportRecord>> RunSandbox(Guid draftId, [FromQuery] string correlationId, [FromQuery] string tenantId, CancellationToken cancellationToken)
        => Ok(await service.RunSandboxAsync(draftId, correlationId, tenantId, cancellationToken));

    [HttpPost("drafts/{draftId:guid}/operator-approval")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AiGenerationDecisionRecord>> OperatorApprove(Guid draftId, [FromBody] AiGenerationDecisionRequest request, CancellationToken cancellationToken)
        => Ok(await service.RecordOperatorApprovalAsync(draftId, request, cancellationToken));

    [HttpPost("drafts/{draftId:guid}/activate")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AiGenerationDecisionRecord>> Activate(Guid draftId, [FromBody] AiGenerationDecisionRequest request, CancellationToken cancellationToken)
        => Ok(await service.ActivateAsync(draftId, request, cancellationToken));
}
