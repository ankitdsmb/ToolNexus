using System;
using System.Net;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExecutionLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.SafeDropConstraintIfExists(
                tableName: "audit_dead_letter",
                constraintName: "FK_audit_dead_letter_audit_events_AuditEventId");

            migrationBuilder.SafeDropConstraintIfExists(
                tableName: "audit_dead_letter",
                constraintName: "FK_audit_dead_letter_audit_outbox_OutboxId");

            migrationBuilder.SafeDropConstraintIfExists(
                tableName: "audit_outbox",
                constraintName: "FK_audit_outbox_audit_events_AuditEventId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "Destination",
                table: "audit_outbox",
                newName: "destination");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "Id",
                table: "audit_outbox",
                newName: "id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "UpdatedAtUtc",
                table: "audit_outbox",
                newName: "updated_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "NextAttemptAtUtc",
                table: "audit_outbox",
                newName: "next_attempt_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "LeaseOwner",
                table: "audit_outbox",
                newName: "lease_owner");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "LeaseExpiresAtUtc",
                table: "audit_outbox",
                newName: "lease_expires_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "LastErrorMessage",
                table: "audit_outbox",
                newName: "last_error_message");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "LastErrorCode",
                table: "audit_outbox",
                newName: "last_error_code");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "LastAttemptAtUtc",
                table: "audit_outbox",
                newName: "last_attempt_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "IdempotencyKey",
                table: "audit_outbox",
                newName: "idempotency_key");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "DeliveryState",
                table: "audit_outbox",
                newName: "delivery_state");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "DeliveredAtUtc",
                table: "audit_outbox",
                newName: "delivered_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "CreatedAtUtc",
                table: "audit_outbox",
                newName: "created_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "AuditEventId",
                table: "audit_outbox",
                newName: "audit_event_id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "AttemptCount",
                table: "audit_outbox",
                newName: "attempt_count");

            migrationBuilder.SafeRenameIndexIfExists(
                name: "IX_audit_outbox_AuditEventId",
                table: "audit_outbox",
                newName: "IX_audit_outbox_audit_event_id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "Action",
                table: "audit_events",
                newName: "action");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "Id",
                table: "audit_events",
                newName: "id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "UserAgent",
                table: "audit_events",
                newName: "user_agent");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "TraceId",
                table: "audit_events",
                newName: "trace_id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "TenantId",
                table: "audit_events",
                newName: "tenant_id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "TargetType",
                table: "audit_events",
                newName: "target_type");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "TargetId",
                table: "audit_events",
                newName: "target_id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "SourceIp",
                table: "audit_events",
                newName: "source_ip");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "SchemaVersion",
                table: "audit_events",
                newName: "schema_version");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "ResultStatus",
                table: "audit_events",
                newName: "result_status");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "RequestId",
                table: "audit_events",
                newName: "request_id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "PayloadRedacted",
                table: "audit_events",
                newName: "payload_redacted");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "PayloadHashSha256",
                table: "audit_events",
                newName: "payload_hash_sha256");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "OccurredAtUtc",
                table: "audit_events",
                newName: "occurred_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "HttpStatus",
                table: "audit_events",
                newName: "http_status");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "CreatedAtUtc",
                table: "audit_events",
                newName: "created_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "ActorType",
                table: "audit_events",
                newName: "actor_type");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "ActorId",
                table: "audit_events",
                newName: "actor_id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "Destination",
                table: "audit_dead_letter",
                newName: "destination");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "Id",
                table: "audit_dead_letter",
                newName: "id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "UpdatedAtUtc",
                table: "audit_dead_letter",
                newName: "updated_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "OutboxId",
                table: "audit_dead_letter",
                newName: "outbox_id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "OperatorStatus",
                table: "audit_dead_letter",
                newName: "operator_status");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "OperatorNote",
                table: "audit_dead_letter",
                newName: "operator_note");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "OperatorId",
                table: "audit_dead_letter",
                newName: "operator_id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "FirstFailedAtUtc",
                table: "audit_dead_letter",
                newName: "first_failed_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "FinalAttemptCount",
                table: "audit_dead_letter",
                newName: "final_attempt_count");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "ErrorSummary",
                table: "audit_dead_letter",
                newName: "error_summary");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "ErrorDetails",
                table: "audit_dead_letter",
                newName: "error_details");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "DeadLetteredAtUtc",
                table: "audit_dead_letter",
                newName: "dead_lettered_at_utc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "AuditEventId",
                table: "audit_dead_letter",
                newName: "audit_event_id");

            migrationBuilder.SafeRenameIndexIfExists(
                name: "IX_audit_dead_letter_OutboxId",
                table: "audit_dead_letter",
                newName: "IX_audit_dead_letter_outbox_id");

            migrationBuilder.SafeRenameIndexIfExists(
                name: "IX_audit_dead_letter_AuditEventId",
                table: "audit_dead_letter",
                newName: "IX_audit_dead_letter_audit_event_id");



            migrationBuilder.SafeEnsureIdentityByDefaultIfMissing(
                tableName: "ToolUseCases",
                columnName: "Id");




            migrationBuilder.SafeEnsureIdentityByDefaultIfMissing(
                tableName: "ToolSteps",
                columnName: "Id");



            migrationBuilder.SafeEnsureIdentityByDefaultIfMissing(
                tableName: "ToolRelated",
                columnName: "Id");



            migrationBuilder.Sql(PostgresMigrationSafety.SafeNoOpIfIdentityExists("ToolFeatures", "Id"));




            migrationBuilder.Sql(PostgresMigrationSafety.EnsureIdentityColumn("ToolFaqs", "Id"));






            migrationBuilder.SafeConvertColumnToBoolean(
                tableName: "ToolExecutionPolicies",
                columnName: "IsExecutionEnabled");



            migrationBuilder.SafeConvertColumnToBoolean(
                tableName: "ToolExecutionEvents",
                columnName: "Success");




            migrationBuilder.Sql(PostgresMigrationSafety.SafeIdentityNoOpIfExists("ToolExecutionEvents", "Id"));




























































            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'audit_events'
                          AND column_name = 'source_ip'
                          AND data_type <> 'inet'
                    ) THEN
                        IF NOT EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = current_schema()
                              AND table_name = 'audit_events'
                              AND column_name = 'source_ip_tmp'
                        ) THEN
                            ALTER TABLE "audit_events" ADD COLUMN "source_ip_tmp" inet;
                        END IF;

                        CREATE OR REPLACE FUNCTION toolnexus_try_inet(value text)
                        RETURNS inet
                        LANGUAGE plpgsql
                        AS $func$
                        BEGIN
                            RETURN value::inet;
                        EXCEPTION WHEN OTHERS THEN
                            RETURN NULL;
                        END;
                        $func$;

                        UPDATE "audit_events"
                        SET "source_ip_tmp" = CASE
                            WHEN "source_ip" IS NULL THEN NULL
                            WHEN "source_ip"::text ~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$' THEN toolnexus_try_inet("source_ip"::text)
                            WHEN "source_ip"::text ~ '^[0-9a-fA-F:]+$' THEN toolnexus_try_inet("source_ip"::text)
                            ELSE NULL
                        END;

                        ALTER TABLE "audit_events" DROP COLUMN "source_ip";
                        ALTER TABLE "audit_events" RENAME COLUMN "source_ip_tmp" TO "source_ip";
                        DROP FUNCTION IF EXISTS toolnexus_try_inet(text);
                    END IF;
                END $$;
                """);




























            migrationBuilder.Sql(PostgresMigrationSafety.EnsureTableExists(
                tableName: "admin_identity_users",
                createSql: @"
                CREATE TABLE admin_identity_users (
                    ""Id"" uuid NOT NULL,
                    ""Email"" character varying(320) NOT NULL,
                    ""NormalizedEmail"" character varying(320) NOT NULL,
                    ""DisplayName"" character varying(120) NOT NULL,
                    ""PasswordHash"" character varying(1024) NOT NULL,
                    ""AccessFailedCount"" integer NOT NULL,
                    ""LockoutEndUtc"" timestamp with time zone NULL,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    CONSTRAINT ""PK_admin_identity_users"" PRIMARY KEY (""Id"")
                );"));

            migrationBuilder.CreateTable(
                name: "execution_runs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    tool_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    executed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    success = table.Column<bool>(type: "boolean", nullable: false),
                    duration_ms = table.Column<long>(type: "bigint", nullable: false),
                    error_type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    payload_size = table.Column<int>(type: "integer", nullable: false),
                    execution_mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    runtime_language = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    adapter_name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    adapter_resolution_status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    capability = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    authority = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    shadow_execution = table.Column<bool>(type: "boolean", nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    tenant_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    trace_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_execution_runs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "execution_authority_decisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    execution_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    authority = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    admission_allowed = table.Column<bool>(type: "boolean", nullable: false),
                    admission_reason = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    decision_source = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_execution_authority_decisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_execution_authority_decisions_execution_runs_execution_run_~",
                        column: x => x.execution_run_id,
                        principalTable: "execution_runs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "execution_conformance_results",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    execution_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_valid = table.Column<bool>(type: "boolean", nullable: false),
                    normalized_status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    was_normalized = table.Column<bool>(type: "boolean", nullable: false),
                    issue_count = table.Column<int>(type: "integer", nullable: false),
                    issues_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_execution_conformance_results", x => x.Id);
                    table.ForeignKey(
                        name: "FK_execution_conformance_results_execution_runs_execution_run_~",
                        column: x => x.execution_run_id,
                        principalTable: "execution_runs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "execution_snapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    execution_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    snapshot_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    authority = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    runtime_language = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    execution_capability = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    tenant_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    timestamp_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    conformance_version = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    policy_snapshot_json = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_execution_snapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_execution_snapshots_execution_runs_execution_run_id",
                        column: x => x.execution_run_id,
                        principalTable: "execution_runs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_admin_identity_users_NormalizedEmail""
                ON admin_identity_users (""NormalizedEmail"");");

            migrationBuilder.CreateIndex(
                name: "IX_execution_authority_decisions_execution_run_id",
                table: "execution_authority_decisions",
                column: "execution_run_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_execution_conformance_results_execution_run_id",
                table: "execution_conformance_results",
                column: "execution_run_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_execution_runs_correlation_id",
                table: "execution_runs",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_execution_runs_executed_at_utc",
                table: "execution_runs",
                column: "executed_at_utc");

            migrationBuilder.CreateIndex(
                name: "idx_execution_runs_tenant_id",
                table: "execution_runs",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "idx_execution_runs_tool_id",
                table: "execution_runs",
                column: "tool_id");

            migrationBuilder.CreateIndex(
                name: "idx_execution_runs_trace_id",
                table: "execution_runs",
                column: "trace_id");

            migrationBuilder.CreateIndex(
                name: "idx_execution_snapshots_snapshot_id",
                table: "execution_snapshots",
                column: "snapshot_id");

            migrationBuilder.CreateIndex(
                name: "IX_execution_snapshots_execution_run_id",
                table: "execution_snapshots",
                column: "execution_run_id",
                unique: true);

            migrationBuilder.SafeAddForeignKeyIfMissing(
                tableName: "audit_dead_letter",
                constraintName: "FK_audit_dead_letter_audit_events_audit_event_id",
                foreignKeySql: "FOREIGN KEY (audit_event_id) REFERENCES audit_events(id) ON DELETE CASCADE");

            migrationBuilder.SafeAddForeignKeyIfMissing(
                tableName: "audit_dead_letter",
                constraintName: "FK_audit_dead_letter_audit_outbox_outbox_id",
                foreignKeySql: "FOREIGN KEY (outbox_id) REFERENCES audit_outbox(id) ON DELETE CASCADE");

            migrationBuilder.SafeAddForeignKeyIfMissing(
                tableName: "audit_outbox",
                constraintName: "FK_audit_outbox_audit_events_audit_event_id",
                foreignKeySql: "FOREIGN KEY (audit_event_id) REFERENCES audit_events(id) ON DELETE CASCADE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.SafeDropConstraintIfExists(
                tableName: "audit_dead_letter",
                constraintName: "FK_audit_dead_letter_audit_events_audit_event_id");

            migrationBuilder.SafeDropConstraintIfExists(
                tableName: "audit_dead_letter",
                constraintName: "FK_audit_dead_letter_audit_outbox_outbox_id");

            migrationBuilder.SafeDropConstraintIfExists(
                tableName: "audit_outbox",
                constraintName: "FK_audit_outbox_audit_events_audit_event_id");

            migrationBuilder.SafeDropTableIfExists("admin_identity_users");
            migrationBuilder.SafeDropTableIfExists("execution_authority_decisions");
            migrationBuilder.SafeDropTableIfExists("execution_conformance_results");
            migrationBuilder.SafeDropTableIfExists("execution_snapshots");
            migrationBuilder.SafeDropTableIfExists("execution_runs");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "destination",
                table: "audit_outbox",
                newName: "Destination");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "id",
                table: "audit_outbox",
                newName: "Id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "updated_at_utc",
                table: "audit_outbox",
                newName: "UpdatedAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "next_attempt_at_utc",
                table: "audit_outbox",
                newName: "NextAttemptAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "lease_owner",
                table: "audit_outbox",
                newName: "LeaseOwner");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "lease_expires_at_utc",
                table: "audit_outbox",
                newName: "LeaseExpiresAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "last_error_message",
                table: "audit_outbox",
                newName: "LastErrorMessage");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "last_error_code",
                table: "audit_outbox",
                newName: "LastErrorCode");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "last_attempt_at_utc",
                table: "audit_outbox",
                newName: "LastAttemptAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "idempotency_key",
                table: "audit_outbox",
                newName: "IdempotencyKey");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "delivery_state",
                table: "audit_outbox",
                newName: "DeliveryState");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "delivered_at_utc",
                table: "audit_outbox",
                newName: "DeliveredAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "created_at_utc",
                table: "audit_outbox",
                newName: "CreatedAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "audit_event_id",
                table: "audit_outbox",
                newName: "AuditEventId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "attempt_count",
                table: "audit_outbox",
                newName: "AttemptCount");

            migrationBuilder.SafeRenameIndexIfExists(
                name: "IX_audit_outbox_audit_event_id",
                table: "audit_outbox",
                newName: "IX_audit_outbox_AuditEventId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "action",
                table: "audit_events",
                newName: "Action");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "id",
                table: "audit_events",
                newName: "Id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "user_agent",
                table: "audit_events",
                newName: "UserAgent");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "trace_id",
                table: "audit_events",
                newName: "TraceId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "tenant_id",
                table: "audit_events",
                newName: "TenantId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "target_type",
                table: "audit_events",
                newName: "TargetType");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "target_id",
                table: "audit_events",
                newName: "TargetId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "source_ip",
                table: "audit_events",
                newName: "SourceIp");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "schema_version",
                table: "audit_events",
                newName: "SchemaVersion");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "result_status",
                table: "audit_events",
                newName: "ResultStatus");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "request_id",
                table: "audit_events",
                newName: "RequestId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "payload_redacted",
                table: "audit_events",
                newName: "PayloadRedacted");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "payload_hash_sha256",
                table: "audit_events",
                newName: "PayloadHashSha256");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "occurred_at_utc",
                table: "audit_events",
                newName: "OccurredAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "http_status",
                table: "audit_events",
                newName: "HttpStatus");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "created_at_utc",
                table: "audit_events",
                newName: "CreatedAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "actor_type",
                table: "audit_events",
                newName: "ActorType");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "actor_id",
                table: "audit_events",
                newName: "ActorId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "destination",
                table: "audit_dead_letter",
                newName: "Destination");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "id",
                table: "audit_dead_letter",
                newName: "Id");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "updated_at_utc",
                table: "audit_dead_letter",
                newName: "UpdatedAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "outbox_id",
                table: "audit_dead_letter",
                newName: "OutboxId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "operator_status",
                table: "audit_dead_letter",
                newName: "OperatorStatus");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "operator_note",
                table: "audit_dead_letter",
                newName: "OperatorNote");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "operator_id",
                table: "audit_dead_letter",
                newName: "OperatorId");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "first_failed_at_utc",
                table: "audit_dead_letter",
                newName: "FirstFailedAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "final_attempt_count",
                table: "audit_dead_letter",
                newName: "FinalAttemptCount");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "error_summary",
                table: "audit_dead_letter",
                newName: "ErrorSummary");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "error_details",
                table: "audit_dead_letter",
                newName: "ErrorDetails");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "dead_lettered_at_utc",
                table: "audit_dead_letter",
                newName: "DeadLetteredAtUtc");

            migrationBuilder.SafeRenameColumnIfExists(
                name: "audit_event_id",
                table: "audit_dead_letter",
                newName: "AuditEventId");

            migrationBuilder.SafeRenameIndexIfExists(
                name: "IX_audit_dead_letter_outbox_id",
                table: "audit_dead_letter",
                newName: "IX_audit_dead_letter_OutboxId");

            migrationBuilder.SafeRenameIndexIfExists(
                name: "IX_audit_dead_letter_audit_event_id",
                table: "audit_dead_letter",
                newName: "IX_audit_dead_letter_AuditEventId");



            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'ToolUseCases'
                          AND column_name = 'Id'
                          AND is_identity = 'YES')
                    THEN
                        ALTER TABLE "ToolUseCases" ALTER COLUMN "Id" DROP IDENTITY IF EXISTS;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'ToolUseCases'
                          AND column_name = 'Id')
                    THEN
                        ALTER TABLE "ToolUseCases" ALTER COLUMN "Id" TYPE INTEGER;
                    END IF;
                END $$;
                """);

















            migrationBuilder.Sql(PostgresMigrationSafety.EnsureIdentityColumn("ToolFaqs", "Id"));









































































































            migrationBuilder.SafeAddForeignKeyIfMissing(
                tableName: "audit_dead_letter",
                constraintName: "FK_audit_dead_letter_audit_events_AuditEventId",
                foreignKeySql: "FOREIGN KEY (\"AuditEventId\") REFERENCES audit_events(\"Id\") ON DELETE CASCADE");

            migrationBuilder.SafeAddForeignKeyIfMissing(
                tableName: "audit_dead_letter",
                constraintName: "FK_audit_dead_letter_audit_outbox_OutboxId",
                foreignKeySql: "FOREIGN KEY (\"OutboxId\") REFERENCES audit_outbox(\"Id\") ON DELETE CASCADE");

            migrationBuilder.SafeAddForeignKeyIfMissing(
                tableName: "audit_outbox",
                constraintName: "FK_audit_outbox_audit_events_AuditEventId",
                foreignKeySql: "FOREIGN KEY (\"AuditEventId\") REFERENCES audit_events(\"Id\") ON DELETE CASCADE");
        }
    }
}
