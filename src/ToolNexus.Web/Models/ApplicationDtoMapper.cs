using ToolNexus.Application.Contracts;

namespace ToolNexus.Web.Models;

public static class ApplicationDtoMapper
{
    public static ToolViewModel ToViewModel(this ToolCatalogItemDto dto) =>
        new(dto.Slug, dto.Title, dto.Category, dto.Actions, dto.SeoTitle, dto.SeoDescription, dto.ExampleInput, dto.ClientSafeActions, dto.Version, dto.IsDeterministic, dto.IsCpuIntensive, dto.IsCacheable, dto.SecurityLevel, dto.RequiresAuthentication, dto.IsDeprecated, dto.RuntimeLanguage, dto.ExecutionCapability, dto.OperationSchema);

    public static ToolContentViewModel ToViewModel(this ToolContentDto dto) =>
        new(
            dto.Id,
            dto.Slug,
            dto.Title,
            dto.SeoTitle,
            dto.SeoDescription,
            dto.Intro,
            dto.LongDescription,
            dto.Keywords,
            dto.Features,
            dto.Steps.Select(x => new ToolStepViewModel(x.Id, x.Slug, x.Title, x.Description, x.SortOrder)).ToArray(),
            dto.Examples.Select(x => new ToolExampleViewModel(x.Id, x.Slug, x.Title, x.Input, x.Output, x.SortOrder)).ToArray(),
            dto.Faq.Select(x => new ToolFaqViewModel(x.Id, x.Slug, x.Question, x.Answer, x.SortOrder)).ToArray(),
            dto.RelatedTools.Select(x => new ToolRelatedViewModel(x.Id, x.Slug, x.RelatedSlug, x.SortOrder)).ToArray(),
            dto.UseCases);
}
