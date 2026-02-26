using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content.Entities;

namespace ToolNexus.Infrastructure.Data;

public sealed class ToolNexusContentDbContext(DbContextOptions<ToolNexusContentDbContext> options) : DbContext(options)
{
    public DbSet<ToolContentEntity> ToolContents => Set<ToolContentEntity>();
    public DbSet<ToolFaqEntity> ToolFaqs => Set<ToolFaqEntity>();
    public DbSet<ToolCategoryEntity> ToolCategories => Set<ToolCategoryEntity>();
    public DbSet<ToolRelatedEntity> ToolRelated => Set<ToolRelatedEntity>();
    public DbSet<ToolFeatureEntity> ToolFeatures => Set<ToolFeatureEntity>();
    public DbSet<ToolStepEntity> ToolSteps => Set<ToolStepEntity>();
    public DbSet<ToolExampleEntity> ToolExamples => Set<ToolExampleEntity>();
    public DbSet<ToolUseCaseEntity> ToolUseCases => Set<ToolUseCaseEntity>();
    public DbSet<ToolDefinitionEntity> ToolDefinitions => Set<ToolDefinitionEntity>();
    public DbSet<ToolExecutionPolicyEntity> ToolExecutionPolicies => Set<ToolExecutionPolicyEntity>();
    public DbSet<ToolExecutionEventEntity> ToolExecutionEvents => Set<ToolExecutionEventEntity>();
    public DbSet<DailyToolMetricsEntity> DailyToolMetrics => Set<DailyToolMetricsEntity>();
    public DbSet<ToolAnomalySnapshotEntity> ToolAnomalySnapshots => Set<ToolAnomalySnapshotEntity>();
    public DbSet<AdminAuditLogEntity> AdminAuditLogs => Set<AdminAuditLogEntity>();
    public DbSet<AuditEventEntity> AuditEvents => Set<AuditEventEntity>();
    public DbSet<AuditOutboxEntity> AuditOutbox => Set<AuditOutboxEntity>();
    public DbSet<AuditDeadLetterEntity> AuditDeadLetters => Set<AuditDeadLetterEntity>();
    public DbSet<RuntimeIncidentEntity> RuntimeIncidents => Set<RuntimeIncidentEntity>();
    public DbSet<ExecutionRunEntity> ExecutionRuns => Set<ExecutionRunEntity>();
    public DbSet<ExecutionSnapshotEntity> ExecutionSnapshots => Set<ExecutionSnapshotEntity>();
    public DbSet<ExecutionConformanceResultEntity> ExecutionConformanceResults => Set<ExecutionConformanceResultEntity>();
    public DbSet<ExecutionAuthorityDecisionEntity> ExecutionAuthorityDecisions => Set<ExecutionAuthorityDecisionEntity>();
    public DbSet<GovernanceDecisionEntity> GovernanceDecisions => Set<GovernanceDecisionEntity>();
    public DbSet<ToolQualityScoreEntity> ToolQualityScores => Set<ToolQualityScoreEntity>();
    public DbSet<CapabilityRegistryEntity> CapabilityRegistry => Set<CapabilityRegistryEntity>();
    public DbSet<AdminIdentityUserEntity> AdminIdentityUsers => Set<AdminIdentityUserEntity>();
    public DbSet<AdminOperationLedgerEntity> AdminOperationLedger => Set<AdminOperationLedgerEntity>();
    public DbSet<OperatorCommandEntity> OperatorCommands => Set<OperatorCommandEntity>();
    public DbSet<PlatformSignalEntity> PlatformSignals => Set<PlatformSignalEntity>();
    public DbSet<PlatformInsightEntity> PlatformInsights => Set<PlatformInsightEntity>();
    public DbSet<OperatorApprovedActionEntity> OperatorApprovedActions => Set<OperatorApprovedActionEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ToolContentEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Slug).HasMaxLength(120);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.SeoTitle).HasMaxLength(200);
            entity.Property(x => x.SeoDescription).HasMaxLength(320);
            entity.Property(x => x.Keywords).HasMaxLength(500);
            entity.Property(x => x.RowVersion).IsConcurrencyToken();

            entity.HasMany(x => x.Features).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Steps).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Examples).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Faq).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.RelatedTools).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.UseCases).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ToolFeatureEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Value).HasMaxLength(256);
        });

        modelBuilder.Entity<ToolStepEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(160);
            entity.Property(x => x.Description).HasMaxLength(1000);
        });

        modelBuilder.Entity<ToolExampleEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(160);
        });

        modelBuilder.Entity<ToolFaqEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Question).HasMaxLength(300);
            entity.Property(x => x.Answer).HasMaxLength(2000);
        });

        modelBuilder.Entity<ToolCategoryEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Slug).HasMaxLength(120);
            entity.Property(x => x.Name).HasMaxLength(120);
        });

        modelBuilder.Entity<ToolRelatedEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.RelatedSlug).HasMaxLength(120);
        });

        modelBuilder.Entity<ToolUseCaseEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Value).HasMaxLength(400);
        });

        modelBuilder.Entity<ToolDefinitionEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.Slug).HasMaxLength(120);
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.Category).HasMaxLength(120);
            entity.Property(x => x.Status).HasMaxLength(20);
            entity.Property(x => x.Icon).HasMaxLength(120);
            entity.Property(x => x.ActionsCsv).HasMaxLength(500);
            entity.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            entity.Property(x => x.RowVersion).IsConcurrencyToken();
        });

        modelBuilder.Entity<ToolExecutionPolicyEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ToolDefinitionId).IsUnique();
            entity.HasIndex(x => x.ToolSlug).IsUnique();
            entity.Property(x => x.ToolSlug).HasMaxLength(120);
            entity.Property(x => x.ExecutionMode).HasMaxLength(20);
            entity.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            entity.Property(x => x.RowVersion).IsConcurrencyToken();
        });

        modelBuilder.Entity<ToolExecutionEventEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ToolSlug);
            entity.HasIndex(x => x.TimestampUtc);
            entity.Property(x => x.ToolSlug).HasMaxLength(120);
            entity.Property(x => x.ErrorType).HasMaxLength(200);
            entity.Property(x => x.ExecutionMode).HasMaxLength(20);
            entity.Property(x => x.TimestampUtc).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<DailyToolMetricsEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.ToolSlug, x.DateUtc }).IsUnique();
            entity.Property(x => x.ToolSlug).HasMaxLength(120);
            entity.Property(x => x.AvgDurationMs);
            entity.Property(x => x.DateUtc).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<ToolAnomalySnapshotEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.ToolSlug, x.DateUtc, x.Type }).IsUnique();
            entity.Property(x => x.ToolSlug).HasMaxLength(120);
            entity.Property(x => x.Type).HasMaxLength(32);
            entity.Property(x => x.Severity).HasMaxLength(16);
            entity.Property(x => x.Description).HasMaxLength(500);
            entity.Property(x => x.DateUtc).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<AdminAuditLogEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.TimestampUtc);
            entity.Property(x => x.UserId).HasMaxLength(120);
            entity.Property(x => x.ActionType).HasMaxLength(120);
            entity.Property(x => x.EntityType).HasMaxLength(120);
            entity.Property(x => x.EntityId).HasMaxLength(120);
            entity.Property(x => x.TimestampUtc).HasColumnType("timestamp with time zone");
        });


        modelBuilder.Entity<AuditEventEntity>(entity =>
        {
            entity.ToTable("audit_events");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OccurredAtUtc).HasColumnName("occurred_at_utc");
            entity.Property(x => x.ActorType).HasColumnName("actor_type");
            entity.Property(x => x.ActorId).HasColumnName("actor_id");
            entity.Property(x => x.TenantId).HasColumnName("tenant_id");
            entity.Property(x => x.TraceId).HasColumnName("trace_id");
            entity.Property(x => x.RequestId).HasColumnName("request_id");
            entity.Property(x => x.Action).HasColumnName("action");
            entity.Property(x => x.TargetType).HasColumnName("target_type");
            entity.Property(x => x.TargetId).HasColumnName("target_id");
            entity.Property(x => x.ResultStatus).HasColumnName("result_status");
            entity.Property(x => x.HttpStatus).HasColumnName("http_status");
            entity.Property(x => x.SourceIp).HasColumnName("source_ip");
            entity.Property(x => x.UserAgent).HasColumnName("user_agent");
            entity.Property(x => x.PayloadRedacted).HasColumnName("payload_redacted");
            entity.Property(x => x.PayloadHashSha256).HasColumnName("payload_hash_sha256");
            entity.Property(x => x.SchemaVersion).HasColumnName("schema_version");
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(x => x.PayloadRedacted).HasColumnType("jsonb");
            entity.Property(x => x.CreatedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.SchemaVersion).HasDefaultValue(1);
            entity.HasIndex(x => x.OccurredAtUtc).HasDatabaseName("idx_audit_events_occurred_at").IsDescending();
            entity.HasIndex(x => new { x.ActorType, x.ActorId, x.OccurredAtUtc }).HasDatabaseName("idx_audit_events_actor").IsDescending(false, false, true);
            entity.HasIndex(x => new { x.Action, x.OccurredAtUtc }).HasDatabaseName("idx_audit_events_action").IsDescending(false, true);
            entity.HasIndex(x => new { x.TenantId, x.OccurredAtUtc }).HasDatabaseName("idx_audit_events_tenant").IsDescending(false, true);
            entity.HasIndex(x => x.TraceId).HasDatabaseName("idx_audit_events_trace");
        });

        modelBuilder.Entity<AuditOutboxEntity>(entity =>
        {
            entity.ToTable("audit_outbox");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.AuditEventId).HasColumnName("audit_event_id");
            entity.Property(x => x.Destination).HasColumnName("destination");
            entity.Property(x => x.IdempotencyKey).HasColumnName("idempotency_key");
            entity.Property(x => x.DeliveryState).HasColumnName("delivery_state");
            entity.Property(x => x.AttemptCount).HasColumnName("attempt_count");
            entity.Property(x => x.NextAttemptAtUtc).HasColumnName("next_attempt_at_utc");
            entity.Property(x => x.LastErrorCode).HasColumnName("last_error_code");
            entity.Property(x => x.LastErrorMessage).HasColumnName("last_error_message");
            entity.Property(x => x.LastAttemptAtUtc).HasColumnName("last_attempt_at_utc");
            entity.Property(x => x.DeliveredAtUtc).HasColumnName("delivered_at_utc");
            entity.Property(x => x.LeaseOwner).HasColumnName("lease_owner");
            entity.Property(x => x.LeaseExpiresAtUtc).HasColumnName("lease_expires_at_utc");
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");
            entity.HasOne(x => x.AuditEvent).WithMany(x => x.OutboxEntries).HasForeignKey(x => x.AuditEventId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.Destination, x.AuditEventId }).IsUnique().HasDatabaseName("ux_audit_outbox_destination_event");
            entity.HasIndex(x => x.IdempotencyKey).IsUnique().HasDatabaseName("ux_audit_outbox_idempotency_key");
            entity.HasIndex(x => new { x.DeliveryState, x.NextAttemptAtUtc }).HasDatabaseName("idx_audit_outbox_sched");
            entity.HasIndex(x => x.LeaseExpiresAtUtc).HasDatabaseName("idx_audit_outbox_lease");
            entity.Property(x => x.CreatedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.AttemptCount).HasDefaultValue(0);
            entity.Property(x => x.NextAttemptAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });


        modelBuilder.Entity<PlatformSignalEntity>(entity =>
        {
            entity.ToTable("platform_signals");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SignalType).HasColumnName("signal_type").HasMaxLength(80);
            entity.Property(x => x.SourceDomain).HasColumnName("source_domain").HasMaxLength(80);
            entity.Property(x => x.Severity).HasColumnName("severity").HasMaxLength(24);
            entity.Property(x => x.DetectedAtUtc).HasColumnName("detected_at_utc");
            entity.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(100);
            entity.Property(x => x.RecommendedActionType).HasColumnName("recommended_action_type").HasMaxLength(80);
            entity.Property(x => x.TenantId).HasColumnName("tenant_id").HasMaxLength(80);
            entity.Property(x => x.AuthorityContext).HasColumnName("authority_context").HasMaxLength(80);
            entity.Property(x => x.PayloadJson).HasColumnName("payload_json").HasColumnType("jsonb");
            entity.Property(x => x.DetectedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(x => x.CorrelationId).HasDatabaseName("idx_platform_signals_correlation");
            entity.HasIndex(x => x.TenantId).HasDatabaseName("idx_platform_signals_tenant");
            entity.HasIndex(x => x.DetectedAtUtc).HasDatabaseName("idx_platform_signals_detected_at").IsDescending();
        });

        modelBuilder.Entity<PlatformInsightEntity>(entity =>
        {
            entity.ToTable("platform_insights");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.RelatedSignalIds).HasColumnName("related_signal_ids").HasColumnType("jsonb");
            entity.Property(x => x.RecommendedAction).HasColumnName("recommended_action").HasMaxLength(400);
            entity.Property(x => x.ImpactScope).HasColumnName("impact_scope").HasMaxLength(120);
            entity.Property(x => x.RiskScore).HasColumnName("risk_score");
            entity.Property(x => x.ConfidenceScore).HasColumnName("confidence_score");
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(24);
            entity.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(100);
            entity.Property(x => x.AuthorityContext).HasColumnName("authority_context").HasMaxLength(80);
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(x => x.DecisionedAtUtc).HasColumnName("decisioned_at_utc");
            entity.Property(x => x.DecisionedBy).HasColumnName("decisioned_by").HasMaxLength(120);
            entity.Property(x => x.CreatedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(x => x.CorrelationId).HasDatabaseName("idx_platform_insights_correlation");
            entity.HasIndex(x => x.CreatedAtUtc).HasDatabaseName("idx_platform_insights_created_at").IsDescending();
            entity.HasIndex(x => x.Status).HasDatabaseName("idx_platform_insights_status");
        });

        modelBuilder.Entity<OperatorApprovedActionEntity>(entity =>
        {
            entity.ToTable("operator_approved_actions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.InsightId).HasColumnName("insight_id");
            entity.Property(x => x.OperatorId).HasColumnName("operator_id").HasMaxLength(120);
            entity.Property(x => x.Decision).HasColumnName("decision").HasMaxLength(24);
            entity.Property(x => x.AuthorityContext).HasColumnName("authority_context").HasMaxLength(80);
            entity.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(100);
            entity.Property(x => x.ActionType).HasColumnName("action_type").HasMaxLength(120);
            entity.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(1000);
            entity.Property(x => x.TimestampUtc).HasColumnName("timestamp_utc");
            entity.Property(x => x.TimestampUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(x => x.CorrelationId).HasDatabaseName("idx_operator_approved_actions_correlation");
            entity.HasIndex(x => x.TimestampUtc).HasDatabaseName("idx_operator_approved_actions_timestamp").IsDescending();
        });

        modelBuilder.Entity<AuditDeadLetterEntity>(entity =>
        {
            entity.ToTable("audit_dead_letter");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OutboxId).HasColumnName("outbox_id");
            entity.Property(x => x.AuditEventId).HasColumnName("audit_event_id");
            entity.Property(x => x.Destination).HasColumnName("destination");
            entity.Property(x => x.FinalAttemptCount).HasColumnName("final_attempt_count");
            entity.Property(x => x.FirstFailedAtUtc).HasColumnName("first_failed_at_utc");
            entity.Property(x => x.DeadLetteredAtUtc).HasColumnName("dead_lettered_at_utc");
            entity.Property(x => x.ErrorSummary).HasColumnName("error_summary");
            entity.Property(x => x.ErrorDetails).HasColumnName("error_details");
            entity.Property(x => x.OperatorStatus).HasColumnName("operator_status");
            entity.Property(x => x.OperatorNote).HasColumnName("operator_note");
            entity.Property(x => x.OperatorId).HasColumnName("operator_id");
            entity.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");
            entity.Property(x => x.ErrorDetails).HasColumnType("jsonb");
            entity.Property(x => x.DeadLetteredAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.OperatorStatus).HasDefaultValue("open");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(x => x.Outbox).WithOne(x => x.DeadLetter).HasForeignKey<AuditDeadLetterEntity>(x => x.OutboxId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.AuditEvent).WithMany().HasForeignKey(x => x.AuditEventId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.OperatorStatus, x.DeadLetteredAtUtc }).HasDatabaseName("idx_audit_dead_letter_status_time").IsDescending(false, true);
            entity.HasIndex(x => new { x.Destination, x.DeadLetteredAtUtc }).HasDatabaseName("idx_audit_dead_letter_destination").IsDescending(false, true);
        });


        modelBuilder.Entity<AdminOperationLedgerEntity>(entity =>
        {
            entity.ToTable("admin_operation_ledger");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OperationDomain).HasColumnName("operation_domain").HasMaxLength(64);
            entity.Property(x => x.OperationName).HasColumnName("operation_name").HasMaxLength(64);
            entity.Property(x => x.RequestedBy).HasColumnName("requested_by").HasMaxLength(120);
            entity.Property(x => x.ResultStatus).HasColumnName("result_status").HasMaxLength(32);
            entity.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(120);
            entity.Property(x => x.PayloadJson).HasColumnName("payload_json").HasColumnType("jsonb");
            entity.Property(x => x.ExecutedAtUtc).HasColumnName("executed_at_utc").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(x => x.CorrelationId).HasDatabaseName("idx_admin_operation_ledger_correlation_id");
            entity.HasIndex(x => x.ExecutedAtUtc).HasDatabaseName("idx_admin_operation_ledger_executed_at").IsDescending();
        });
        modelBuilder.Entity<ExecutionRunEntity>(entity =>
        {
            entity.ToTable("execution_runs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ToolId).HasColumnName("tool_id").HasMaxLength(120);
            entity.Property(x => x.ExecutedAtUtc).HasColumnName("executed_at_utc").HasColumnType("timestamp with time zone");
            entity.Property(x => x.Success).HasColumnName("success");
            entity.Property(x => x.DurationMs).HasColumnName("duration_ms");
            entity.Property(x => x.ErrorType).HasColumnName("error_type").HasMaxLength(200);
            entity.Property(x => x.PayloadSize).HasColumnName("payload_size");
            entity.Property(x => x.ExecutionMode).HasColumnName("execution_mode").HasMaxLength(32);
            entity.Property(x => x.RuntimeLanguage).HasColumnName("runtime_language").HasMaxLength(64);
            entity.Property(x => x.AdapterName).HasColumnName("adapter_name").HasMaxLength(128);
            entity.Property(x => x.AdapterResolutionStatus).HasColumnName("adapter_resolution_status").HasMaxLength(64);
            entity.Property(x => x.Capability).HasColumnName("capability").HasMaxLength(64);
            entity.Property(x => x.Authority).HasColumnName("authority").HasMaxLength(64);
            entity.Property(x => x.ShadowExecution).HasColumnName("shadow_execution");
            entity.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(120);
            entity.Property(x => x.TenantId).HasColumnName("tenant_id").HasMaxLength(120);
            entity.Property(x => x.TraceId).HasColumnName("trace_id").HasMaxLength(64);
            entity.HasIndex(x => x.CorrelationId).HasDatabaseName("idx_execution_runs_correlation_id");
            entity.HasIndex(x => x.TenantId).HasDatabaseName("idx_execution_runs_tenant_id");
            entity.HasIndex(x => x.ToolId).HasDatabaseName("idx_execution_runs_tool_id");
            entity.HasIndex(x => x.ExecutedAtUtc).HasDatabaseName("idx_execution_runs_executed_at_utc");
            entity.HasIndex(x => x.TraceId).HasDatabaseName("idx_execution_runs_trace_id");
        });

        modelBuilder.Entity<ExecutionSnapshotEntity>(entity =>
        {
            entity.ToTable("execution_snapshots");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ExecutionRunId).HasColumnName("execution_run_id");
            entity.Property(x => x.SnapshotId).HasColumnName("snapshot_id").HasMaxLength(120);
            entity.Property(x => x.Authority).HasColumnName("authority").HasMaxLength(64);
            entity.Property(x => x.RuntimeLanguage).HasColumnName("runtime_language").HasMaxLength(64);
            entity.Property(x => x.ExecutionCapability).HasColumnName("execution_capability").HasMaxLength(64);
            entity.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(120);
            entity.Property(x => x.TenantId).HasColumnName("tenant_id").HasMaxLength(120);
            entity.Property(x => x.TimestampUtc).HasColumnName("timestamp_utc").HasColumnType("timestamp with time zone");
            entity.Property(x => x.ConformanceVersion).HasColumnName("conformance_version").HasMaxLength(40);
            entity.Property(x => x.PolicySnapshotJson).HasColumnName("policy_snapshot_json").HasColumnType("jsonb");
            entity.Property(x => x.GovernanceDecisionId).HasColumnName("governance_decision_id");
            entity.HasIndex(x => x.SnapshotId).HasDatabaseName("idx_execution_snapshots_snapshot_id");
            entity.HasIndex(x => x.GovernanceDecisionId).HasDatabaseName("idx_execution_snapshots_governance_decision_id");
            entity.HasOne(x => x.ExecutionRun).WithOne(x => x.Snapshot).HasForeignKey<ExecutionSnapshotEntity>(x => x.ExecutionRunId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.GovernanceDecision).WithMany(x => x.ExecutionSnapshots).HasForeignKey(x => x.GovernanceDecisionId).OnDelete(DeleteBehavior.Restrict);
        });


        modelBuilder.Entity<GovernanceDecisionEntity>(entity =>
        {
            entity.ToTable("governance_decisions");
            entity.HasKey(x => x.DecisionId);
            entity.Property(x => x.DecisionId).HasColumnName("decision_id");
            entity.Property(x => x.ToolId).HasColumnName("tool_id").HasMaxLength(120);
            entity.Property(x => x.CapabilityId).HasColumnName("capability_id").HasMaxLength(120);
            entity.Property(x => x.Authority).HasColumnName("authority").HasMaxLength(64);
            entity.Property(x => x.ApprovedBy).HasColumnName("approved_by").HasMaxLength(120);
            entity.Property(x => x.DecisionReason).HasColumnName("decision_reason").HasMaxLength(2000);
            entity.Property(x => x.PolicyVersion).HasColumnName("policy_version").HasMaxLength(64);
            entity.Property(x => x.TimestampUtc).HasColumnName("timestamp_utc").HasColumnType("timestamp with time zone");
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(20);
            entity.HasIndex(x => x.ToolId).HasDatabaseName("idx_governance_decisions_tool_id");
            entity.HasIndex(x => x.PolicyVersion).HasDatabaseName("idx_governance_decisions_policy_version");
            entity.HasIndex(x => x.TimestampUtc).HasDatabaseName("idx_governance_decisions_timestamp_utc");
        });

        modelBuilder.Entity<CapabilityRegistryEntity>(entity =>
        {
            entity.ToTable("capability_registry");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.CapabilityId).HasColumnName("capability_id").HasMaxLength(300);
            entity.Property(x => x.Provider).HasColumnName("provider").HasMaxLength(120);
            entity.Property(x => x.Version).HasColumnName("version").HasMaxLength(40);
            entity.Property(x => x.ToolId).HasColumnName("tool_id").HasMaxLength(160);
            entity.Property(x => x.RuntimeLanguage).HasColumnName("runtime_language").HasMaxLength(40);
            entity.Property(x => x.ExecutionCapabilityType).HasColumnName("execution_capability_type").HasMaxLength(40);
            entity.Property(x => x.UiRenderingType).HasColumnName("ui_rendering_type");
            entity.Property(x => x.ActivationState).HasColumnName("activation_state");
            entity.Property(x => x.ComplexityTier).HasColumnName("complexity_tier");
            entity.Property(x => x.PermissionsJson).HasColumnName("permissions_json").HasColumnType("jsonb");
            entity.Property(x => x.Status).HasColumnName("status");
            entity.Property(x => x.InstallationState).HasColumnName("installation_state");
            entity.Property(x => x.Authority).HasColumnName("authority").HasMaxLength(40);
            entity.Property(x => x.SnapshotId).HasColumnName("snapshot_id").HasMaxLength(120);
            entity.Property(x => x.PolicyVersionToken).HasColumnName("policy_version_token").HasMaxLength(120);
            entity.Property(x => x.PolicyExecutionEnabled).HasColumnName("policy_execution_enabled");
            entity.Property(x => x.SyncedAtUtc).HasColumnName("synced_at_utc");
            entity.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");
            entity.HasIndex(x => x.CapabilityId).IsUnique().HasDatabaseName("ux_capability_registry_capability_id");
            entity.HasIndex(x => x.ToolId).HasDatabaseName("idx_capability_registry_tool_id");
            entity.HasIndex(x => x.ActivationState).HasDatabaseName("idx_capability_registry_activation_state");
            entity.HasIndex(x => x.SyncedAtUtc).HasDatabaseName("idx_capability_registry_synced_at_utc");
            entity.Property(x => x.SyncedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<ToolQualityScoreEntity>(entity =>
        {
            entity.ToTable("tool_quality_scores");
            entity.HasKey(x => new { x.ToolId, x.TimestampUtc });
            entity.Property(x => x.ToolId).HasColumnName("tool_id").HasMaxLength(120);
            entity.Property(x => x.Score).HasColumnName("score").HasPrecision(5, 2);
            entity.Property(x => x.ArchitectureScore).HasColumnName("architecture_score").HasPrecision(5, 2);
            entity.Property(x => x.TestCoverageScore).HasColumnName("test_coverage_score").HasPrecision(5, 2);
            entity.Property(x => x.CraftScore).HasColumnName("craft_score").HasPrecision(5, 2);
            entity.Property(x => x.TimestampUtc).HasColumnName("timestamp_utc").HasColumnType("timestamp with time zone");
            entity.HasIndex(x => x.ToolId).HasDatabaseName("idx_tool_quality_scores_tool_id");
            entity.HasIndex(x => x.TimestampUtc).HasDatabaseName("idx_tool_quality_scores_timestamp_utc");
        });

        modelBuilder.Entity<ExecutionConformanceResultEntity>(entity =>
        {
            entity.ToTable("execution_conformance_results");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ExecutionRunId).HasColumnName("execution_run_id");
            entity.Property(x => x.IsValid).HasColumnName("is_valid");
            entity.Property(x => x.NormalizedStatus).HasColumnName("normalized_status").HasMaxLength(64);
            entity.Property(x => x.WasNormalized).HasColumnName("was_normalized");
            entity.Property(x => x.IssueCount).HasColumnName("issue_count");
            entity.Property(x => x.IssuesJson).HasColumnName("issues_json").HasColumnType("jsonb");
            entity.HasOne(x => x.ExecutionRun).WithOne(x => x.Conformance).HasForeignKey<ExecutionConformanceResultEntity>(x => x.ExecutionRunId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExecutionAuthorityDecisionEntity>(entity =>
        {
            entity.ToTable("execution_authority_decisions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ExecutionRunId).HasColumnName("execution_run_id");
            entity.Property(x => x.Authority).HasColumnName("authority").HasMaxLength(64);
            entity.Property(x => x.AdmissionAllowed).HasColumnName("admission_allowed");
            entity.Property(x => x.AdmissionReason).HasColumnName("admission_reason").HasMaxLength(120);
            entity.Property(x => x.DecisionSource).HasColumnName("decision_source").HasMaxLength(120);
            entity.HasOne(x => x.ExecutionRun).WithOne(x => x.AuthorityDecision).HasForeignKey<ExecutionAuthorityDecisionEntity>(x => x.ExecutionRunId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OperatorCommandEntity>(entity =>
        {
            entity.ToTable("operator_commands");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Command).HasColumnName("command").HasMaxLength(100);
            entity.Property(x => x.ExecutedBy).HasColumnName("executed_by").HasMaxLength(200);
            entity.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(2000);
            entity.Property(x => x.TimestampUtc).HasColumnName("timestamp_utc").HasColumnType("timestamp with time zone");
            entity.Property(x => x.Result).HasColumnName("result").HasMaxLength(60);
            entity.Property(x => x.RollbackInfo).HasColumnName("rollback_info").HasMaxLength(2000);
            entity.Property(x => x.ImpactScope).HasColumnName("impact_scope").HasMaxLength(160);
            entity.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(120);
            entity.Property(x => x.AuthorityContext).HasColumnName("authority_context").HasMaxLength(80);
            entity.HasIndex(x => x.CorrelationId).HasDatabaseName("idx_operator_commands_correlation_id");
            entity.HasIndex(x => x.TimestampUtc).HasDatabaseName("idx_operator_commands_timestamp_utc").IsDescending();
        });

        modelBuilder.Entity<RuntimeIncidentEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Fingerprint).IsUnique();
            entity.HasIndex(x => x.LastOccurredUtc);
            entity.HasIndex(x => x.ToolSlug);
            entity.Property(x => x.Fingerprint).HasMaxLength(400);
            entity.Property(x => x.ToolSlug).HasMaxLength(120);
            entity.Property(x => x.Phase).HasMaxLength(30);
            entity.Property(x => x.ErrorType).HasMaxLength(40);
            entity.Property(x => x.Message).HasMaxLength(2000);
            entity.Property(x => x.CorrelationId).HasMaxLength(120);
            entity.Property(x => x.PayloadType).HasMaxLength(80);
            entity.Property(x => x.Severity).HasMaxLength(20);
            entity.Property(x => x.FirstOccurredUtc).HasColumnType("timestamp with time zone");
            entity.Property(x => x.LastOccurredUtc).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<AdminIdentityUserEntity>(entity =>
        {
            entity.ToTable("admin_identity_users");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.NormalizedEmail).IsUnique();
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.NormalizedEmail).HasMaxLength(320);
            entity.Property(x => x.DisplayName).HasMaxLength(120);
            entity.Property(x => x.PasswordHash).HasMaxLength(1024);
            entity.Property(x => x.CreatedAtUtc).HasColumnType("timestamp with time zone");
            entity.Property(x => x.LockoutEndUtc).HasColumnType("timestamp with time zone");
        });
    }
}
