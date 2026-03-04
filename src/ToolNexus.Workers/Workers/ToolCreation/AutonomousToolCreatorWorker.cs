using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ToolNexus.Workers.Workers.ToolCreation;

/// <summary>
/// Background worker that converts high-scoring opportunities into draft tool submissions.
/// Flow:
/// tool_opportunities -> score threshold filter -> AI generation -> draft storage.
/// </summary>
public sealed class AutonomousToolCreatorWorker(
    IToolOpportunityRepository toolOpportunityRepository,
    IAiToolGeneratorService aiToolGeneratorService,
    IToolDraftRepository toolDraftRepository,
    ILogger<AutonomousToolCreatorWorker> logger,
    AutonomousToolCreatorOptions options) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Autonomous tool creator worker started with threshold {Threshold}.", options.ScoreThreshold);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessOpportunitiesAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Autonomous tool creator worker iteration failed.");
            }

            await Task.Delay(options.PollInterval, stoppingToken).ConfigureAwait(false);
        }
    }

    private async Task ProcessOpportunitiesAsync(CancellationToken cancellationToken)
    {
        var opportunities = await toolOpportunityRepository
            .GetPendingAsync(cancellationToken)
            .ConfigureAwait(false);

        foreach (var opportunity in opportunities.Where(x => x.Score > options.ScoreThreshold))
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (await toolDraftRepository.ExistsForOpportunityAsync(opportunity.Id, cancellationToken).ConfigureAwait(false))
            {
                logger.LogDebug("Skipping opportunity {OpportunityId}; draft already exists.", opportunity.Id);
                continue;
            }

            var generated = await aiToolGeneratorService.GenerateFromOpportunityAsync(opportunity, cancellationToken).ConfigureAwait(false);
            var slug = await BuildUniqueSlugAsync(generated.Slug, cancellationToken).ConfigureAwait(false);

            var draft = ToolDraft.Create(
                opportunityId: opportunity.Id,
                slug: slug,
                schemaJson: generated.SchemaJson,
                seoTitle: generated.SeoTitle,
                seoDescription: generated.SeoDescription,
                status: ToolPublicationStatus.Draft);

            await toolDraftRepository.SaveDraftAsync(draft, cancellationToken).ConfigureAwait(false);
            await toolOpportunityRepository.MarkProcessedAsync(opportunity.Id, cancellationToken).ConfigureAwait(false);

            logger.LogInformation(
                "Created draft tool {Slug} for opportunity {OpportunityId}. Status flow: {Flow}",
                slug,
                opportunity.Id,
                ToolPublicationStatus.FlowDescription);
        }
    }

    private async Task<string> BuildUniqueSlugAsync(string proposedSlug, CancellationToken cancellationToken)
    {
        var baseSlug = SlugSanitizer.Normalize(proposedSlug);
        var candidate = baseSlug;
        var suffix = 1;

        while (await toolDraftRepository.SlugExistsAsync(candidate, cancellationToken).ConfigureAwait(false))
        {
            candidate = $"{baseSlug}-{suffix++}";
        }

        return candidate;
    }
}

public sealed record AutonomousToolCreatorOptions(double ScoreThreshold, TimeSpan PollInterval)
{
    public static AutonomousToolCreatorOptions Default { get; } = new(ScoreThreshold: 80, PollInterval: TimeSpan.FromMinutes(5));
}

public static class SlugSanitizer
{
    public static string Normalize(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "generated-tool";
        }

        var chars = value
            .Trim()
            .ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : '-')
            .ToArray();

        var compacted = new string(chars)
            .Replace("--", "-")
            .Trim('-');

        return string.IsNullOrWhiteSpace(compacted) ? "generated-tool" : compacted;
    }
}

public static class ToolPublicationStatus
{
    public const string Draft = "draft";
    public const string Moderation = "moderation";
    public const string Certification = "certification";
    public const string Published = "published";
    public const string FlowDescription = "draft -> moderation -> certification -> published";
}

public sealed record ToolOpportunity(Guid Id, double Score, string Prompt);

public sealed record GeneratedToolPackage(string Slug, string SchemaJson, string SeoTitle, string SeoDescription);

public sealed record ToolDraft(Guid OpportunityId, string Slug, string SchemaJson, string SeoTitle, string SeoDescription, string Status)
{
    public static ToolDraft Create(
        Guid opportunityId,
        string slug,
        string schemaJson,
        string seoTitle,
        string seoDescription,
        string status)
    {
        return new ToolDraft(opportunityId, slug, schemaJson, seoTitle, seoDescription, status);
    }
}

public interface IToolOpportunityRepository
{
    Task<IReadOnlyList<ToolOpportunity>> GetPendingAsync(CancellationToken cancellationToken);
    Task MarkProcessedAsync(Guid opportunityId, CancellationToken cancellationToken);
}

public interface IAiToolGeneratorService
{
    Task<GeneratedToolPackage> GenerateFromOpportunityAsync(ToolOpportunity opportunity, CancellationToken cancellationToken);
}

public interface IToolDraftRepository
{
    Task<bool> ExistsForOpportunityAsync(Guid opportunityId, CancellationToken cancellationToken);
    Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken);
    Task SaveDraftAsync(ToolDraft draft, CancellationToken cancellationToken);
}
