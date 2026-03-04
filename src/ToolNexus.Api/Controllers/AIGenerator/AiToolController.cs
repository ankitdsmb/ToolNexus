using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.AIGenerator;

[ApiController]
[Route("api/ai")]
public sealed class AiToolController(IAiToolGeneratorService aiToolGeneratorService) : ControllerBase
{
    [HttpPost("generate-tool")]
    public async Task<ActionResult<AiGeneratedToolRecord>> GenerateTool([FromBody] AiToolGenerationRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Prompt))
        {
            return BadRequest("Prompt is required.");
        }

        var draft = await aiToolGeneratorService.GenerateToolDraftAsync(request, cancellationToken);
        return Ok(draft);
    }
}
