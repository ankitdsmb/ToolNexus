using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Tools.DocumentConverter;

namespace ToolNexus.Web.Controllers.Api;

[ApiController]
[Route("api/tools/document-converter")]
public sealed class DocumentConverterController(DocumentConverterService converterService) : ControllerBase
{
    [HttpPost("run")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<IActionResult> Run([FromForm] IFormFile? file, [FromForm] string? mode, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "A DOCX or PDF file is required." });
        }

        if (string.IsNullOrWhiteSpace(mode))
        {
            return BadRequest(new { error = "Conversion mode is required." });
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await converterService.ConvertAsync(stream, file.FileName, mode, cancellationToken);
            Response.Headers.Append("X-ToolNexus-Diagnostics", JsonSerializer.Serialize(result.Diagnostics));
            Response.Headers.Append("X-ToolNexus-ExecutionTimeMs", ((long)result.Duration.TotalMilliseconds).ToString());
            Response.Headers.Append("X-ToolNexus-OutputFileName", result.FileName);

            return File(result.Content, result.ContentType, result.FileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
