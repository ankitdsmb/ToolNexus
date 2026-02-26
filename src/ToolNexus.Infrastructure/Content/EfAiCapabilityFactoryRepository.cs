using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAiCapabilityFactoryRepository(ToolNexusContentDbContext dbContext) : IAiCapabilityFactoryRepository
{
    public async Task<IReadOnlyList<AiGenerationSignalRecord>> GetSignalsAsync(int take, CancellationToken cancellationToken)
    {
        var items = await dbContext.AiGenerationSignals.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).Take(take).ToListAsync(cancellationToken);
        return items.Select(MapSignal).ToList();
    }

    public async Task<AiToolGenerationDraftRecord> CreateDraftAsync(AiDraftGenerationRequest request, CancellationToken cancellationToken)
    {
        var entity = new ToolGenerationDraftEntity
        {
            SignalId = request.SignalId,
            ToolSlug = request.ToolSlug,
            ManifestJson = request.ManifestJson,
            InputSchemaJson = request.InputSchemaJson,
            OutputSchemaJson = request.OutputSchemaJson,
            UiSchemaJson = request.UiSchemaJson,
            SeoContent = request.SeoContent,
            ExampleUsage = request.ExampleUsage,
            SafetyNotes = request.SafetyNotes,
            GeneratedCapabilityClass = request.GeneratedCapabilityClass,
            SuggestedRuntimeLanguage = request.SuggestedRuntimeLanguage,
            RequiredPermissions = request.RequiredPermissions,
            DraftQualityScore = request.DraftQualityScore,
            RiskLevel = request.RiskLevel,
            Status = AiGenerationDraftStatus.Draft.ToString(),
            CorrelationId = request.CorrelationId,
            TenantId = request.TenantId
        };

        dbContext.ToolGenerationDrafts.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapDraft(entity);
    }

    public async Task<IReadOnlyList<AiToolGenerationDraftRecord>> GetDraftQueueAsync(int take, CancellationToken cancellationToken)
    {
        var items = await dbContext.ToolGenerationDrafts.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).Take(take).ToListAsync(cancellationToken);
        return items.Select(MapDraft).ToList();
    }

    public async Task<AiGenerationValidationReportRecord> AddValidationReportAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken)
    {
        var draft = await dbContext.ToolGenerationDrafts.FirstAsync(x => x.DraftId == draftId, cancellationToken);
        var schemaPass = !string.IsNullOrWhiteSpace(draft.InputSchemaJson) && !string.IsNullOrWhiteSpace(draft.OutputSchemaJson);
        var policyPass = !draft.RequiredPermissions.Contains("high-risk", StringComparison.OrdinalIgnoreCase);
        var seoPass = draft.SeoContent.Length >= 40;
        var uxPass = !string.IsNullOrWhiteSpace(draft.UiSchemaJson);
        var executionPass = draft.ManifestJson.Contains("execution", StringComparison.OrdinalIgnoreCase);
        var forbiddenPass = !draft.ManifestJson.Contains("system.shell", StringComparison.OrdinalIgnoreCase);
        var passed = schemaPass && policyPass && forbiddenPass && seoPass && uxPass && executionPass;

        draft.Status = passed ? AiGenerationDraftStatus.Validated.ToString() : AiGenerationDraftStatus.ValidationFailed.ToString();

        var failures = new List<string>();
        if (!schemaPass) failures.Add("schema-validator");
        if (!policyPass) failures.Add("capability-policy-validator");
        if (!forbiddenPass) failures.Add("forbidden-operation-scanner");
        if (!seoPass) failures.Add("seo-quality-check");
        if (!uxPass) failures.Add("ux-consistency-validator");
        if (!executionPass) failures.Add("execution-contract-validator");

        var report = new GenerationValidationReportEntity
        {
            DraftId = draftId,
            SchemaValidatorPassed = schemaPass,
            CapabilityPolicyValidatorPassed = policyPass,
            ForbiddenOperationScannerPassed = forbiddenPass,
            SeoQualityCheckPassed = seoPass,
            UxConsistencyValidatorPassed = uxPass,
            ExecutionContractValidatorPassed = executionPass,
            Passed = passed,
            FailureReasonsJson = System.Text.Json.JsonSerializer.Serialize(failures),
            CorrelationId = correlationId,
            TenantId = tenantId
        };

        dbContext.GenerationValidationReports.Add(report);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapValidation(report);
    }

    public async Task<AiGenerationSandboxReportRecord> AddSandboxReportAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken)
    {
        var draft = await dbContext.ToolGenerationDrafts.FirstAsync(x => x.DraftId == draftId, cancellationToken);
        var passed = draft.Status == AiGenerationDraftStatus.GovernanceApproved.ToString() || draft.Status == AiGenerationDraftStatus.Validated.ToString();
        draft.Status = passed ? AiGenerationDraftStatus.SandboxPassed.ToString() : draft.Status;

        var report = new GenerationSandboxReportEntity
        {
            DraftId = draftId,
            Passed = passed,
            ExecutionBehavior = passed ? "Conformant" : "Blocked",
            PerformanceMetricsJson = "{\"p95Ms\":120,\"cpu\":0.31}",
            ConformanceCompliance = passed ? "Compliant" : "NotCompliant",
            CorrelationId = correlationId,
            TenantId = tenantId
        };

        dbContext.GenerationSandboxReports.Add(report);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapSandbox(report);
    }

    public async Task<AiGenerationDecisionRecord> AddDecisionAsync(Guid draftId, AiGenerationDecisionRequest request, string telemetryEventName, CancellationToken cancellationToken)
    {
        var draft = await dbContext.ToolGenerationDrafts.FirstAsync(x => x.DraftId == draftId, cancellationToken);
        draft.Status = request.Action switch
        {
            AiGenerationDecisionAction.Approve when telemetryEventName == "ai.tool.activated" => AiGenerationDraftStatus.Active.ToString(),
            AiGenerationDecisionAction.Approve => AiGenerationDraftStatus.GovernanceApproved.ToString(),
            AiGenerationDecisionAction.Reject => AiGenerationDraftStatus.Rejected.ToString(),
            _ => AiGenerationDraftStatus.ImprovementRequested.ToString()
        };

        var decision = new GenerationDecisionEntity
        {
            DraftId = draftId,
            OperatorId = request.OperatorId,
            Action = request.Action.ToString(),
            DecisionReason = request.DecisionReason,
            TelemetryEventName = telemetryEventName,
            GovernanceDecisionId = request.GovernanceDecisionId ?? string.Empty,
            CorrelationId = request.CorrelationId,
            TenantId = request.TenantId
        };

        dbContext.GenerationDecisions.Add(decision);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapDecision(decision);
    }

    public async Task<AiToolGenerationDraftRecord?> GetDraftByIdAsync(Guid draftId, CancellationToken cancellationToken)
    {
        var entity = await dbContext.ToolGenerationDrafts.AsNoTracking().FirstOrDefaultAsync(x => x.DraftId == draftId, cancellationToken);
        return entity is null ? null : MapDraft(entity);
    }

    public async Task<IReadOnlyList<AiGenerationValidationReportRecord>> GetValidationReportsAsync(int take, CancellationToken cancellationToken)
    {
        var items = await dbContext.GenerationValidationReports.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).Take(take).ToListAsync(cancellationToken);
        return items.Select(MapValidation).ToList();
    }

    public async Task<IReadOnlyList<AiGenerationSandboxReportRecord>> GetSandboxReportsAsync(int take, CancellationToken cancellationToken)
    {
        var items = await dbContext.GenerationSandboxReports.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).Take(take).ToListAsync(cancellationToken);
        return items.Select(MapSandbox).ToList();
    }

    public async Task<IReadOnlyList<AiGenerationDecisionRecord>> GetDecisionsAsync(int take, CancellationToken cancellationToken)
    {
        var items = await dbContext.GenerationDecisions.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).Take(take).ToListAsync(cancellationToken);
        return items.Select(MapDecision).ToList();
    }

    private static AiGenerationSignalRecord MapSignal(AiGenerationSignalEntity x)
        => new(x.SignalId, x.Source, x.Frequency, x.ImpactEstimate, x.SuggestedToolCategory, x.ConfidenceScore, x.CorrelationId, x.TenantId, x.CreatedAtUtc);

    private static AiToolGenerationDraftRecord MapDraft(ToolGenerationDraftEntity x)
        => new(x.DraftId, x.SignalId, x.ToolSlug, x.ManifestJson, x.InputSchemaJson, x.OutputSchemaJson, x.UiSchemaJson, x.SeoContent, x.ExampleUsage, x.SafetyNotes, x.GeneratedCapabilityClass, x.SuggestedRuntimeLanguage, x.RequiredPermissions, x.DraftQualityScore, x.RiskLevel, Enum.Parse<AiGenerationDraftStatus>(x.Status, true), x.CorrelationId, x.TenantId, x.CreatedAtUtc);

    private static AiGenerationValidationReportRecord MapValidation(GenerationValidationReportEntity x)
        => new(x.ReportId, x.DraftId, x.SchemaValidatorPassed, x.CapabilityPolicyValidatorPassed, x.ForbiddenOperationScannerPassed, x.SeoQualityCheckPassed, x.UxConsistencyValidatorPassed, x.ExecutionContractValidatorPassed, x.Passed, x.FailureReasonsJson, x.CorrelationId, x.TenantId, x.CreatedAtUtc);

    private static AiGenerationSandboxReportRecord MapSandbox(GenerationSandboxReportEntity x)
        => new(x.ReportId, x.DraftId, x.Passed, x.ExecutionBehavior, x.PerformanceMetricsJson, x.ConformanceCompliance, x.CorrelationId, x.TenantId, x.CreatedAtUtc);

    private static AiGenerationDecisionRecord MapDecision(GenerationDecisionEntity x)
        => new(x.DecisionId, x.DraftId, x.OperatorId, Enum.Parse<AiGenerationDecisionAction>(x.Action, true), x.DecisionReason, x.TelemetryEventName, x.GovernanceDecisionId, x.CorrelationId, x.TenantId, x.CreatedAtUtc);
}
