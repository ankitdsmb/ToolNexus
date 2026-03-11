using ToolNexus.Application.Contracts;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolContentService(IToolContentRepository repository) : IToolContentService
{
    public async Task<ToolContentDto?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var content = await repository.GetBySlugAsync(slug, cancellationToken);
        return content is null ? null : ToDto(content);
    }

    public Task<IReadOnlyCollection<string>> GetAllSlugsAsync(CancellationToken cancellationToken = default) =>
        repository.GetAllSlugsAsync(cancellationToken);

    private static ToolContentDto ToDto(ToolContent content) =>
        new(
            content.Id,
            content.Slug,
            content.Title,
            content.SeoTitle,
            content.SeoDescription,
            content.Intro,
            content.LongDescription,
            content.Keywords,
            content.Features,
            content.Steps.Select(x => new ToolStepDto(x.Id, x.Slug, x.Title, x.Description, x.SortOrder)).ToArray(),
            content.Examples.Select(x => new ToolExampleDto(x.Id, x.Slug, x.Title, x.Input, x.Output, x.SortOrder)).ToArray(),
            content.Faq.Select(x => new ToolFaqDto(x.Id, x.Slug, x.Question, x.Answer, x.SortOrder)).ToArray(),
            content.RelatedTools.Select(x => new ToolRelatedDto(x.Id, x.Slug, x.RelatedSlug, x.SortOrder)).ToArray(),
            content.UseCases);
}
