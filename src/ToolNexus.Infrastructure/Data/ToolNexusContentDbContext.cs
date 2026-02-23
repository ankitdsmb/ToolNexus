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
            entity.Property(x => x.UpdatedAt);
        });

        modelBuilder.Entity<ToolExecutionPolicyEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ToolDefinitionId).IsUnique();
            entity.HasIndex(x => x.ToolSlug).IsUnique();
            entity.Property(x => x.ToolSlug).HasMaxLength(120);
            entity.Property(x => x.ExecutionMode).HasMaxLength(20);
            entity.Property(x => x.UpdatedAt);
        });

        modelBuilder.Entity<ToolExecutionEventEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ToolSlug);
            entity.HasIndex(x => x.TimestampUtc);
            entity.Property(x => x.ToolSlug).HasMaxLength(120);
            entity.Property(x => x.ErrorType).HasMaxLength(200);
            entity.Property(x => x.ExecutionMode).HasMaxLength(20);
        });

        modelBuilder.Entity<DailyToolMetricsEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.ToolSlug, x.DateUtc }).IsUnique();
            entity.Property(x => x.ToolSlug).HasMaxLength(120);
            entity.Property(x => x.AvgDurationMs);
        });

        modelBuilder.Entity<ToolAnomalySnapshotEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.ToolSlug, x.DateUtc, x.Type }).IsUnique();
            entity.Property(x => x.ToolSlug).HasMaxLength(120);
            entity.Property(x => x.Type).HasMaxLength(32);
            entity.Property(x => x.Severity).HasMaxLength(16);
            entity.Property(x => x.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<AdminAuditLogEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.TimestampUtc);
            entity.Property(x => x.UserId).HasMaxLength(120);
            entity.Property(x => x.ActionType).HasMaxLength(120);
            entity.Property(x => x.EntityType).HasMaxLength(120);
            entity.Property(x => x.EntityId).HasMaxLength(120);
        });


        modelBuilder.Entity<AuditEventEntity>(entity =>
        {
            entity.ToTable("audit_events");
            entity.HasKey(x => x.Id);
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

        modelBuilder.Entity<AuditDeadLetterEntity>(entity =>
        {
            entity.ToTable("audit_dead_letter");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ErrorDetails).HasColumnType("jsonb");
            entity.Property(x => x.DeadLetteredAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.OperatorStatus).HasDefaultValue("open");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(x => x.Outbox).WithOne(x => x.DeadLetter).HasForeignKey<AuditDeadLetterEntity>(x => x.OutboxId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.AuditEvent).WithMany().HasForeignKey(x => x.AuditEventId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.OperatorStatus, x.DeadLetteredAtUtc }).HasDatabaseName("idx_audit_dead_letter_status_time").IsDescending(false, true);
            entity.HasIndex(x => new { x.Destination, x.DeadLetteredAtUtc }).HasDatabaseName("idx_audit_dead_letter_destination").IsDescending(false, true);
        });
    }
}
