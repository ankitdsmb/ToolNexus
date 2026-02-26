using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiCapabilityFactoryDomain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "activation_state",
                table: "capability_registry",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "execution_capability_type",
                table: "capability_registry",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ui_rendering_type",
                table: "capability_registry",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "admin_operation_ledger",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operation_domain = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    operation_name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    requested_by = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    result_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false),
                    executed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_operation_ledger", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ai_generation_signals",
                columns: table => new
                {
                    SignalId = table.Column<Guid>(type: "uuid", nullable: false),
                    Source = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Frequency = table.Column<int>(type: "integer", nullable: false),
                    ImpactEstimate = table.Column<decimal>(type: "numeric", nullable: false),
                    SuggestedToolCategory = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ConfidenceScore = table.Column<decimal>(type: "numeric", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    TenantId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_generation_signals", x => x.SignalId);
                });

            migrationBuilder.CreateTable(
                name: "generation_decisions",
                columns: table => new
                {
                    DecisionId = table.Column<Guid>(type: "uuid", nullable: false),
                    DraftId = table.Column<Guid>(type: "uuid", nullable: false),
                    OperatorId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Action = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    DecisionReason = table.Column<string>(type: "text", nullable: false),
                    TelemetryEventName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    GovernanceDecisionId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    TenantId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_generation_decisions", x => x.DecisionId);
                });

            migrationBuilder.CreateTable(
                name: "generation_sandbox_reports",
                columns: table => new
                {
                    ReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    DraftId = table.Column<Guid>(type: "uuid", nullable: false),
                    Passed = table.Column<bool>(type: "boolean", nullable: false),
                    ExecutionBehavior = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    PerformanceMetricsJson = table.Column<string>(type: "text", nullable: false),
                    ConformanceCompliance = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    TenantId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_generation_sandbox_reports", x => x.ReportId);
                });

            migrationBuilder.CreateTable(
                name: "generation_validation_reports",
                columns: table => new
                {
                    ReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    DraftId = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemaValidatorPassed = table.Column<bool>(type: "boolean", nullable: false),
                    CapabilityPolicyValidatorPassed = table.Column<bool>(type: "boolean", nullable: false),
                    ForbiddenOperationScannerPassed = table.Column<bool>(type: "boolean", nullable: false),
                    SeoQualityCheckPassed = table.Column<bool>(type: "boolean", nullable: false),
                    UxConsistencyValidatorPassed = table.Column<bool>(type: "boolean", nullable: false),
                    ExecutionContractValidatorPassed = table.Column<bool>(type: "boolean", nullable: false),
                    Passed = table.Column<bool>(type: "boolean", nullable: false),
                    FailureReasonsJson = table.Column<string>(type: "text", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    TenantId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_generation_validation_reports", x => x.ReportId);
                });

            migrationBuilder.CreateTable(
                name: "operator_approved_actions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    insight_id = table.Column<Guid>(type: "uuid", nullable: false),
                    operator_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    decision = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    authority_context = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    action_type = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    timestamp_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operator_approved_actions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "operator_commands",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    command = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    executed_by = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    timestamp_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    result = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    rollback_info = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    impact_scope = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    authority_context = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operator_commands", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "platform_insights",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    related_signal_ids = table.Column<string>(type: "jsonb", nullable: false),
                    recommended_action = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    impact_scope = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    risk_score = table.Column<decimal>(type: "numeric", nullable: false),
                    confidence_score = table.Column<decimal>(type: "numeric", nullable: false),
                    status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    authority_context = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    decisioned_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    decisioned_by = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_platform_insights", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "platform_signals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    signal_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    source_domain = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    severity = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    detected_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    correlation_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    recommended_action_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    tenant_id = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    authority_context = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_platform_signals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tool_generation_drafts",
                columns: table => new
                {
                    DraftId = table.Column<Guid>(type: "uuid", nullable: false),
                    SignalId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToolSlug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ManifestJson = table.Column<string>(type: "text", nullable: false),
                    InputSchemaJson = table.Column<string>(type: "text", nullable: false),
                    OutputSchemaJson = table.Column<string>(type: "text", nullable: false),
                    UiSchemaJson = table.Column<string>(type: "text", nullable: false),
                    SeoContent = table.Column<string>(type: "text", nullable: false),
                    ExampleUsage = table.Column<string>(type: "text", nullable: false),
                    SafetyNotes = table.Column<string>(type: "text", nullable: false),
                    GeneratedCapabilityClass = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    SuggestedRuntimeLanguage = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    RequiredPermissions = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DraftQualityScore = table.Column<decimal>(type: "numeric", nullable: false),
                    RiskLevel = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    TenantId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tool_generation_drafts", x => x.DraftId);
                });

            migrationBuilder.CreateIndex(
                name: "idx_capability_registry_activation_state",
                table: "capability_registry",
                column: "activation_state");

            migrationBuilder.CreateIndex(
                name: "idx_admin_operation_ledger_correlation_id",
                table: "admin_operation_ledger",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_admin_operation_ledger_executed_at",
                table: "admin_operation_ledger",
                column: "executed_at_utc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_ai_generation_signals_correlation_id",
                table: "ai_generation_signals",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "idx_ai_generation_signals_created_at",
                table: "ai_generation_signals",
                column: "CreatedAtUtc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_ai_generation_signals_tenant_id",
                table: "ai_generation_signals",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "idx_generation_decisions_correlation_id",
                table: "generation_decisions",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "idx_generation_decisions_created_at",
                table: "generation_decisions",
                column: "CreatedAtUtc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_generation_decisions_draft_id",
                table: "generation_decisions",
                column: "DraftId");

            migrationBuilder.CreateIndex(
                name: "idx_generation_decisions_tenant_id",
                table: "generation_decisions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "idx_generation_sandbox_reports_correlation_id",
                table: "generation_sandbox_reports",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "idx_generation_sandbox_reports_created_at",
                table: "generation_sandbox_reports",
                column: "CreatedAtUtc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_generation_sandbox_reports_draft_id",
                table: "generation_sandbox_reports",
                column: "DraftId");

            migrationBuilder.CreateIndex(
                name: "idx_generation_sandbox_reports_tenant_id",
                table: "generation_sandbox_reports",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "idx_generation_validation_reports_correlation_id",
                table: "generation_validation_reports",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "idx_generation_validation_reports_created_at",
                table: "generation_validation_reports",
                column: "CreatedAtUtc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_generation_validation_reports_draft_id",
                table: "generation_validation_reports",
                column: "DraftId");

            migrationBuilder.CreateIndex(
                name: "idx_generation_validation_reports_tenant_id",
                table: "generation_validation_reports",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "idx_operator_approved_actions_correlation",
                table: "operator_approved_actions",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_operator_approved_actions_timestamp",
                table: "operator_approved_actions",
                column: "timestamp_utc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_operator_commands_correlation_id",
                table: "operator_commands",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_operator_commands_timestamp_utc",
                table: "operator_commands",
                column: "timestamp_utc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_platform_insights_correlation",
                table: "platform_insights",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_platform_insights_created_at",
                table: "platform_insights",
                column: "created_at_utc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_platform_insights_status",
                table: "platform_insights",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "idx_platform_signals_correlation",
                table: "platform_signals",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_platform_signals_detected_at",
                table: "platform_signals",
                column: "detected_at_utc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_platform_signals_tenant",
                table: "platform_signals",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "idx_tool_generation_drafts_correlation_id",
                table: "tool_generation_drafts",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "idx_tool_generation_drafts_created_at",
                table: "tool_generation_drafts",
                column: "CreatedAtUtc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_tool_generation_drafts_signal_id",
                table: "tool_generation_drafts",
                column: "SignalId");

            migrationBuilder.CreateIndex(
                name: "idx_tool_generation_drafts_tenant_id",
                table: "tool_generation_drafts",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_operation_ledger");

            migrationBuilder.DropTable(
                name: "ai_generation_signals");

            migrationBuilder.DropTable(
                name: "generation_decisions");

            migrationBuilder.DropTable(
                name: "generation_sandbox_reports");

            migrationBuilder.DropTable(
                name: "generation_validation_reports");

            migrationBuilder.DropTable(
                name: "operator_approved_actions");

            migrationBuilder.DropTable(
                name: "operator_commands");

            migrationBuilder.DropTable(
                name: "platform_insights");

            migrationBuilder.DropTable(
                name: "platform_signals");

            migrationBuilder.DropTable(
                name: "tool_generation_drafts");

            migrationBuilder.DropIndex(
                name: "idx_capability_registry_activation_state",
                table: "capability_registry");

            migrationBuilder.DropColumn(
                name: "activation_state",
                table: "capability_registry");

            migrationBuilder.DropColumn(
                name: "execution_capability_type",
                table: "capability_registry");

            migrationBuilder.DropColumn(
                name: "ui_rendering_type",
                table: "capability_registry");
        }
    }
}
