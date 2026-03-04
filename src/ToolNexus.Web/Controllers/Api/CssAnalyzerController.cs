using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Controllers.Api;

[ApiController]
[Route("api/tools/css")]
public sealed class CssAnalyzerController(
    ToolNexusContentDbContext dbContext,
    UrlSecurityValidator urlSecurityValidator,
    ILogger<CssAnalyzerController> logger) : ControllerBase
{
    [HttpPost("analyze")]
    public async Task<IActionResult> Analyze([FromBody] CssAnalyzeRequest request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest(new { error = "URL is required." });
        }

        ValidatedUrl validatedUrl;
        try
        {
            validatedUrl = await urlSecurityValidator.ValidateAndPinAsync(request.Url, cancellationToken);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var job = new CssScanJob
        {
            Id = Guid.NewGuid(),
            Url = validatedUrl.NormalizedUrl,
            Status = "Pending",
            JobMetadataJson = $"{{\"PinnedIp\":\"{validatedUrl.PinnedAddress}\"}}",
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        dbContext.CssScanJobs.Add(job);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("scan_started JobId={JobId} Url={Url} PinnedIp={PinnedIp}", job.Id, validatedUrl.NormalizedUrl, validatedUrl.PinnedAddress);
        return Ok(new { jobId = job.Id, status = job.Status });
    }

    [HttpGet("result/{jobId:guid}")]
    public async Task<IActionResult> GetResult(Guid jobId, CancellationToken cancellationToken)
    {
        var job = await dbContext.CssScanJobs
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == jobId, cancellationToken);

        if (job is null)
        {
            return NotFound(new { error = "Scan job not found." });
        }

        var result = await dbContext.CssScanResults
            .AsNoTracking()
            .Include(x => x.Artifacts)
            .SingleOrDefaultAsync(x => x.JobId == jobId, cancellationToken);

        return Ok(new
        {
            jobId,
            status = job.Status,
            error = job.ErrorMessage,
            result = result is null ? null : new
            {
                totalCss = result.TotalCssBytes,
                usedCss = result.UsedCssBytes,
                unusedCss = result.UnusedCssBytes,
                optimizationPotential = result.OptimizationPotential,
                framework = result.Framework,
                artifactId = result.Artifacts.FirstOrDefault(x => x.ArtifactType == "optimized_css")?.Id
            }
        });
    }

    [HttpPost("download")]
    public async Task<IActionResult> Download([FromBody] CssDownloadRequest request, CancellationToken cancellationToken)
    {
        var artifact = await dbContext.CssArtifacts
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.ArtifactId, cancellationToken);

        if (artifact is null || !System.IO.File.Exists(artifact.FilePath))
        {
            return NotFound(new { error = "Artifact not found." });
        }

        var bytes = await System.IO.File.ReadAllBytesAsync(artifact.FilePath, cancellationToken);
        return File(bytes, artifact.ContentType, artifact.FileName);
    }

    public sealed record CssAnalyzeRequest(string Url);
    public sealed record CssDownloadRequest(Guid ArtifactId);
}
