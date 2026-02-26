using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("admin/execution")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ExecutionMonitoringController(IAdminExecutionMonitoringService service, IAdminControlPlaneService controlPlaneService, IAutonomousInsightsService autonomousInsightsService, ILogger<ExecutionMonitoringController> logger) : ControllerBase
{
    [HttpGet("health")]
    public async Task<ActionResult<ExecutionHealthSummary>> GetHealth(CancellationToken cancellationToken)
    {
        logger.LogInformation("Admin execution health requested.");
        return Ok(await service.GetHealthAsync(cancellationToken));
    }

    [HttpGet("workers")]
    public async Task<ActionResult<ExecutionWorkersResponse>> GetWorkers(CancellationToken cancellationToken)
    {
        logger.LogInformation("Admin execution workers requested.");
        return Ok(await service.GetWorkersAsync(cancellationToken));
    }

    [HttpGet("incidents")]
    public async Task<ActionResult<ExecutionIncidentPage>> GetIncidents([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Admin execution incidents requested. page={Page} pageSize={PageSize}", page, pageSize);
        return Ok(await service.GetIncidentsAsync(page, pageSize, cancellationToken));
    }

    [HttpGet("stream")]
    public async Task<ActionResult<IReadOnlyList<ExecutionStreamItem>>> GetExecutionStream([FromQuery] int take = 25, CancellationToken cancellationToken = default)
        => Ok(await service.GetExecutionStreamAsync(take, cancellationToken));

    [HttpGet("governance")]
    public async Task<ActionResult<GovernanceVisibilitySummary>> GetGovernance(CancellationToken cancellationToken)
        => Ok(await service.GetGovernanceVisibilityAsync(cancellationToken));

    [HttpGet("capability-lifecycle")]
    public async Task<ActionResult<CapabilityLifecycleSummary>> GetCapabilityLifecycle(CancellationToken cancellationToken)
        => Ok(await service.GetCapabilityLifecycleAsync(cancellationToken));

    [HttpGet("quality")]
    public async Task<ActionResult<QualityIntelligenceSummary>> GetQuality(CancellationToken cancellationToken)
        => Ok(await service.GetQualityIntelligenceAsync(cancellationToken));

    [HttpGet("command-center")]
    public async Task<ActionResult<OperatorCommandCenterSnapshot>> GetCommandCenter(CancellationToken cancellationToken)
        => Ok(await service.GetCommandCenterSnapshotAsync(1, 15, 25, cancellationToken));


    [HttpGet("autonomous-insights")]
    public async Task<ActionResult<AutonomousInsightsPanel>> GetAutonomousInsights([FromQuery] int take = 15, CancellationToken cancellationToken = default)
        => Ok(await autonomousInsightsService.GetPanelAsync(take, cancellationToken));

    [HttpPost("autonomous-insights/{insightId:guid}/approve")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<IActionResult> ApproveAutonomousInsight(Guid insightId, [FromBody] AutonomousInsightDecisionRequest request, CancellationToken cancellationToken)
        => await autonomousInsightsService.ApproveAsync(insightId, request, cancellationToken) ? Ok() : NotFound();

    [HttpPost("autonomous-insights/{insightId:guid}/reject")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<IActionResult> RejectAutonomousInsight(Guid insightId, [FromBody] AutonomousInsightDecisionRequest request, CancellationToken cancellationToken)
        => await autonomousInsightsService.RejectAsync(insightId, request, cancellationToken) ? Ok() : NotFound();

    [HttpPost("operations/cache-reset")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AdminControlPlaneOperationResult>> ResetCaches([FromBody] OperatorCommandRequest request, CancellationToken cancellationToken)
    {
        logger.LogWarning("Admin control-plane cache reset requested.");
        return Ok(await controlPlaneService.ResetCachesAsync(request, cancellationToken));
    }

    [HttpPost("operations/queue-drain")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AdminControlPlaneOperationResult>> DrainQueue([FromBody] OperatorCommandRequest request, CancellationToken cancellationToken)
    {
        logger.LogWarning("Admin control-plane queue drain requested.");
        return Ok(await controlPlaneService.DrainAuditQueueAsync(request, cancellationToken));
    }

    [HttpPost("operations/queue-replay")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AdminControlPlaneOperationResult>> ReplayDeadLetters([FromBody] OperatorCommandRequest request, CancellationToken cancellationToken)
    {
        logger.LogWarning("Admin control-plane dead-letter replay requested.");
        return Ok(await controlPlaneService.ReplayAuditDeadLettersAsync(request, cancellationToken));
    }
}
