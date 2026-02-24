using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/debug")]
public sealed class DebugController(ToolNexusContentDbContext dbContext, ILogger<DebugController> logger) : ControllerBase
{
    [HttpGet("tools-count")]
    public async Task<IActionResult> GetToolsCount(CancellationToken cancellationToken)
    {
        var provider = dbContext.Database.IsSqlite()
            ? "Sqlite"
            : dbContext.Database.IsNpgsql()
                ? "PostgreSQL"
                : dbContext.Database.ProviderName ?? "Unknown";

        logger.LogInformation("Admin debug tools-count requested. provider={Provider}", provider);

        return Ok(new
        {
            provider,
            toolsCount = await dbContext.ToolDefinitions.CountAsync(cancellationToken),
            contentsCount = await dbContext.ToolContents.CountAsync(cancellationToken),
            policiesCount = await dbContext.ToolExecutionPolicies.CountAsync(cancellationToken)
        });
    }
}
