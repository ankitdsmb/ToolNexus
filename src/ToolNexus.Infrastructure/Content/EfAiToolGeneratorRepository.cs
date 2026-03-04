using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAiToolGeneratorRepository(ToolNexusContentDbContext dbContext) : IAiToolGeneratorRepository
{
    public async Task<AiGeneratedToolRecord> CreateDraftAsync(string prompt, string schema, string manifest, CancellationToken cancellationToken)
    {
        var entity = new AiGeneratedToolEntity
        {
            Prompt = prompt,
            Schema = schema,
            Manifest = manifest,
            Status = "draft"
        };

        dbContext.AiGeneratedTools.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new AiGeneratedToolRecord(entity.Id, entity.Prompt, entity.Schema, entity.Manifest, entity.Status);
    }
}
