using System;
using System.Net;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

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

            migrationBuilder.AlterColumn<string>(
                name: "Value",
                table: "ToolUseCases",
                type: "character varying(400)",
                maxLength: 400,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 400);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolUseCases",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolUseCases",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_attribute attribute
                        JOIN pg_class table_definition
                          ON table_definition.oid = attribute.attrelid
                        JOIN pg_namespace schema_definition
                          ON schema_definition.oid = table_definition.relnamespace
                        WHERE schema_definition.nspname = current_schema()
                          AND table_definition.relname = 'ToolUseCases'
                          AND attribute.attname = 'Id'
                          AND attribute.attidentity = '')
                    THEN
                        ALTER TABLE "ToolUseCases"
                            ALTER COLUMN "Id" TYPE integer,
                            ALTER COLUMN "Id" DROP DEFAULT,
                            ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY;
                    END IF;
                END $$;
                """);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolSteps",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "ToolSteps",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 160);

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolSteps",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "ToolSteps",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 1000);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_attribute attribute
                        JOIN pg_class table_definition
                          ON table_definition.oid = attribute.attrelid
                        JOIN pg_namespace schema_definition
                          ON schema_definition.oid = table_definition.relnamespace
                        WHERE schema_definition.nspname = current_schema()
                          AND table_definition.relname = 'ToolSteps'
                          AND attribute.attname = 'Id'
                          AND attribute.attidentity = '')
                    THEN
                        ALTER TABLE "ToolSteps"
                            ALTER COLUMN "Id" TYPE integer,
                            ALTER COLUMN "Id" DROP DEFAULT,
                            ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY;
                    END IF;
                END $$;
                """);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolRelated",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolRelated",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "RelatedSlug",
                table: "ToolRelated",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_attribute attribute
                        JOIN pg_class table_definition
                          ON table_definition.oid = attribute.attrelid
                        JOIN pg_namespace schema_definition
                          ON schema_definition.oid = table_definition.relnamespace
                        WHERE schema_definition.nspname = current_schema()
                          AND table_definition.relname = 'ToolRelated'
                          AND attribute.attname = 'Id'
                          AND attribute.attidentity = '')
                    THEN
                        ALTER TABLE "ToolRelated"
                            ALTER COLUMN "Id" TYPE integer,
                            ALTER COLUMN "Id" DROP DEFAULT,
                            ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY;
                    END IF;
                END $$;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Value",
                table: "ToolFeatures",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 256);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolFeatures",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolFeatures",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_attribute attribute
                        JOIN pg_class table_definition
                          ON table_definition.oid = attribute.attrelid
                        JOIN pg_namespace schema_definition
                          ON schema_definition.oid = table_definition.relnamespace
                        WHERE schema_definition.nspname = current_schema()
                          AND table_definition.relname = 'ToolFeatures'
                          AND attribute.attname = 'Id'
                          AND attribute.attidentity = '')
                    THEN
                        ALTER TABLE "ToolFeatures"
                            ALTER COLUMN "Id" TYPE integer,
                            ALTER COLUMN "Id" DROP DEFAULT,
                            ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY;
                    END IF;
                END $$;
                """);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolFaqs",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolFaqs",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "Question",
                table: "ToolFaqs",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 300);

            migrationBuilder.AlterColumn<string>(
                name: "Answer",
                table: "ToolFaqs",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolFaqs",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "ToolExecutionPolicies",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<int>(
                name: "ToolDefinitionId",
                table: "ToolExecutionPolicies",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<int>(
                name: "TimeoutSeconds",
                table: "ToolExecutionPolicies",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<byte[]>(
                name: "RowVersion",
                table: "ToolExecutionPolicies",
                type: "bytea",
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "BLOB",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "MaxRequestsPerMinute",
                table: "ToolExecutionPolicies",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<int>(
                name: "MaxInputSize",
                table: "ToolExecutionPolicies",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<bool>(
                name: "IsExecutionEnabled",
                table: "ToolExecutionPolicies",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "ExecutionMode",
                table: "ToolExecutionPolicies",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolExecutionPolicies",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "ToolExecutionEvents",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<bool>(
                name: "Success",
                table: "ToolExecutionEvents",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<int>(
                name: "PayloadSize",
                table: "ToolExecutionEvents",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "ExecutionMode",
                table: "ToolExecutionEvents",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "ErrorType",
                table: "ToolExecutionEvents",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<long>(
                name: "DurationMs",
                table: "ToolExecutionEvents",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "ToolExecutionEvents",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolExamples",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "ToolExamples",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 160);

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolExamples",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "Output",
                table: "ToolExamples",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "Input",
                table: "ToolExamples",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolExamples",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ToolDefinitions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolDefinitions",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                table: "ToolDefinitions",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<byte[]>(
                name: "RowVersion",
                table: "ToolDefinitions",
                type: "bytea",
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "BLOB",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "OutputSchema",
                table: "ToolDefinitions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "ToolDefinitions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "InputSchema",
                table: "ToolDefinitions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "Icon",
                table: "ToolDefinitions",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "ToolDefinitions",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "ToolDefinitions",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "ActionsCsv",
                table: "ToolDefinitions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolDefinitions",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "ToolContents",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                table: "ToolContents",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "SeoTitle",
                table: "ToolContents",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "SeoDescription",
                table: "ToolContents",
                type: "character varying(320)",
                maxLength: 320,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 320);

            migrationBuilder.AlterColumn<byte[]>(
                name: "RowVersion",
                table: "ToolContents",
                type: "bytea",
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "BLOB",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LongDescription",
                table: "ToolContents",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "Keywords",
                table: "ToolContents",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "Intro",
                table: "ToolContents",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolContents",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                table: "ToolCategories",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "ToolCategories",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolCategories",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "ToolAnomalySnapshots",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 32);

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "ToolAnomalySnapshots",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Severity",
                table: "ToolAnomalySnapshots",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 16);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "ToolAnomalySnapshots",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "ToolAnomalySnapshots",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "RuntimeIncidents",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Stack",
                table: "RuntimeIncidents",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Severity",
                table: "RuntimeIncidents",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "Phase",
                table: "RuntimeIncidents",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 30);

            migrationBuilder.AlterColumn<string>(
                name: "PayloadType",
                table: "RuntimeIncidents",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 80);

            migrationBuilder.AlterColumn<string>(
                name: "Message",
                table: "RuntimeIncidents",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "Fingerprint",
                table: "RuntimeIncidents",
                type: "character varying(400)",
                maxLength: 400,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 400);

            migrationBuilder.AlterColumn<string>(
                name: "ErrorType",
                table: "RuntimeIncidents",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 40);

            migrationBuilder.AlterColumn<int>(
                name: "Count",
                table: "RuntimeIncidents",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "CorrelationId",
                table: "RuntimeIncidents",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120,
                oldNullable: true);

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "RuntimeIncidents",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<long>(
                name: "TotalPayloadSize",
                table: "DailyToolMetrics",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<long>(
                name: "TotalExecutions",
                table: "DailyToolMetrics",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "DailyToolMetrics",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<long>(
                name: "SuccessCount",
                table: "DailyToolMetrics",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<long>(
                name: "MaxDurationMs",
                table: "DailyToolMetrics",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<long>(
                name: "FailureCount",
                table: "DailyToolMetrics",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<double>(
                name: "AvgDurationMs",
                table: "DailyToolMetrics",
                type: "double precision",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "REAL");

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "DailyToolMetrics",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "destination",
                table: "audit_outbox",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "audit_outbox",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at_utc",
                table: "audit_outbox",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<DateTime>(
                name: "next_attempt_at_utc",
                table: "audit_outbox",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<string>(
                name: "lease_owner",
                table: "audit_outbox",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "lease_expires_at_utc",
                table: "audit_outbox",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "last_error_message",
                table: "audit_outbox",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "last_error_code",
                table: "audit_outbox",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "last_attempt_at_utc",
                table: "audit_outbox",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "idempotency_key",
                table: "audit_outbox",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "delivery_state",
                table: "audit_outbox",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "delivered_at_utc",
                table: "audit_outbox",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at_utc",
                table: "audit_outbox",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<Guid>(
                name: "audit_event_id",
                table: "audit_outbox",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<int>(
                name: "attempt_count",
                table: "audit_outbox",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldDefaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "action",
                table: "audit_events",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "audit_events",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "user_agent",
                table: "audit_events",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "trace_id",
                table: "audit_events",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "tenant_id",
                table: "audit_events",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "target_type",
                table: "audit_events",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "target_id",
                table: "audit_events",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<IPAddress>(
                name: "source_ip",
                table: "audit_events",
                type: "inet",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "schema_version",
                table: "audit_events",
                type: "integer",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldDefaultValue: 1);

            migrationBuilder.AlterColumn<string>(
                name: "result_status",
                table: "audit_events",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "request_id",
                table: "audit_events",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "payload_hash_sha256",
                table: "audit_events",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "occurred_at_utc",
                table: "audit_events",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<int>(
                name: "http_status",
                table: "audit_events",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at_utc",
                table: "audit_events",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<string>(
                name: "actor_type",
                table: "audit_events",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "actor_id",
                table: "audit_events",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "destination",
                table: "audit_dead_letter",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "audit_dead_letter",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at_utc",
                table: "audit_dead_letter",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<Guid>(
                name: "outbox_id",
                table: "audit_dead_letter",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "operator_status",
                table: "audit_dead_letter",
                type: "text",
                nullable: false,
                defaultValue: "open",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValue: "open");

            migrationBuilder.AlterColumn<string>(
                name: "operator_note",
                table: "audit_dead_letter",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "operator_id",
                table: "audit_dead_letter",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "first_failed_at_utc",
                table: "audit_dead_letter",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<int>(
                name: "final_attempt_count",
                table: "audit_dead_letter",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "error_summary",
                table: "audit_dead_letter",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "dead_lettered_at_utc",
                table: "audit_dead_letter",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<Guid>(
                name: "audit_event_id",
                table: "audit_dead_letter",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "AdminAuditLogs",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "EntityType",
                table: "AdminAuditLogs",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "EntityId",
                table: "AdminAuditLogs",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "BeforeJson",
                table: "AdminAuditLogs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AfterJson",
                table: "AdminAuditLogs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ActionType",
                table: "AdminAuditLogs",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "AdminAuditLogs",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.CreateTable(
                name: "admin_identity_users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    NormalizedEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false),
                    LockoutEndUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_identity_users", x => x.Id);
                });

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

            migrationBuilder.CreateIndex(
                name: "IX_admin_identity_users_NormalizedEmail",
                table: "admin_identity_users",
                column: "NormalizedEmail",
                unique: true);

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

            migrationBuilder.AddForeignKey(
                name: "FK_audit_dead_letter_audit_events_audit_event_id",
                table: "audit_dead_letter",
                column: "audit_event_id",
                principalTable: "audit_events",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_audit_dead_letter_audit_outbox_outbox_id",
                table: "audit_dead_letter",
                column: "outbox_id",
                principalTable: "audit_outbox",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_audit_outbox_audit_events_audit_event_id",
                table: "audit_outbox",
                column: "audit_event_id",
                principalTable: "audit_events",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
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

            migrationBuilder.DropTable(
                name: "admin_identity_users");

            migrationBuilder.DropTable(
                name: "execution_authority_decisions");

            migrationBuilder.DropTable(
                name: "execution_conformance_results");

            migrationBuilder.DropTable(
                name: "execution_snapshots");

            migrationBuilder.DropTable(
                name: "execution_runs");

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

            migrationBuilder.AlterColumn<string>(
                name: "Value",
                table: "ToolUseCases",
                type: "TEXT",
                maxLength: 400,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(400)",
                oldMaxLength: 400);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolUseCases",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolUseCases",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

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

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolSteps",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "ToolSteps",
                type: "TEXT",
                maxLength: 160,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(160)",
                oldMaxLength: 160);

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolSteps",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "ToolSteps",
                type: "TEXT",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolSteps",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolRelated",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolRelated",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "RelatedSlug",
                table: "ToolRelated",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolRelated",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Value",
                table: "ToolFeatures",
                type: "TEXT",
                maxLength: 256,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(256)",
                oldMaxLength: 256);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolFeatures",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolFeatures",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolFeatures",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolFaqs",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolFaqs",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Question",
                table: "ToolFaqs",
                type: "TEXT",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(300)",
                oldMaxLength: 300);

            migrationBuilder.AlterColumn<string>(
                name: "Answer",
                table: "ToolFaqs",
                type: "TEXT",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolFaqs",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "ToolExecutionPolicies",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<int>(
                name: "ToolDefinitionId",
                table: "ToolExecutionPolicies",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "TimeoutSeconds",
                table: "ToolExecutionPolicies",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<byte[]>(
                name: "RowVersion",
                table: "ToolExecutionPolicies",
                type: "BLOB",
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "MaxRequestsPerMinute",
                table: "ToolExecutionPolicies",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "MaxInputSize",
                table: "ToolExecutionPolicies",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "IsExecutionEnabled",
                table: "ToolExecutionPolicies",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "ExecutionMode",
                table: "ToolExecutionPolicies",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolExecutionPolicies",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "ToolExecutionEvents",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<int>(
                name: "Success",
                table: "ToolExecutionEvents",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<int>(
                name: "PayloadSize",
                table: "ToolExecutionEvents",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "ExecutionMode",
                table: "ToolExecutionEvents",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "ErrorType",
                table: "ToolExecutionEvents",
                type: "TEXT",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DurationMs",
                table: "ToolExecutionEvents",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolExecutionEvents",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<int>(
                name: "ToolContentId",
                table: "ToolExamples",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "ToolExamples",
                type: "TEXT",
                maxLength: 160,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(160)",
                oldMaxLength: 160);

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolExamples",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Output",
                table: "ToolExamples",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Input",
                table: "ToolExamples",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolExamples",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ToolDefinitions",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "ToolDefinitions",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                table: "ToolDefinitions",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<byte[]>(
                name: "RowVersion",
                table: "ToolDefinitions",
                type: "BLOB",
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "OutputSchema",
                table: "ToolDefinitions",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "ToolDefinitions",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "InputSchema",
                table: "ToolDefinitions",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Icon",
                table: "ToolDefinitions",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "ToolDefinitions",
                type: "TEXT",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "ToolDefinitions",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "ActionsCsv",
                table: "ToolDefinitions",
                type: "TEXT",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolDefinitions",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "ToolContents",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                table: "ToolContents",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "SeoTitle",
                table: "ToolContents",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "SeoDescription",
                table: "ToolContents",
                type: "TEXT",
                maxLength: 320,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(320)",
                oldMaxLength: 320);

            migrationBuilder.AlterColumn<byte[]>(
                name: "RowVersion",
                table: "ToolContents",
                type: "BLOB",
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LongDescription",
                table: "ToolContents",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Keywords",
                table: "ToolContents",
                type: "TEXT",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "Intro",
                table: "ToolContents",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolContents",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                table: "ToolCategories",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "ToolCategories",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolCategories",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "ToolAnomalySnapshots",
                type: "TEXT",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32);

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "ToolAnomalySnapshots",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Severity",
                table: "ToolAnomalySnapshots",
                type: "TEXT",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "ToolAnomalySnapshots",
                type: "TEXT",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ToolAnomalySnapshots",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "RuntimeIncidents",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Stack",
                table: "RuntimeIncidents",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Severity",
                table: "RuntimeIncidents",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "Phase",
                table: "RuntimeIncidents",
                type: "TEXT",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);

            migrationBuilder.AlterColumn<string>(
                name: "PayloadType",
                table: "RuntimeIncidents",
                type: "TEXT",
                maxLength: 80,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(80)",
                oldMaxLength: 80);

            migrationBuilder.AlterColumn<string>(
                name: "Message",
                table: "RuntimeIncidents",
                type: "TEXT",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "Fingerprint",
                table: "RuntimeIncidents",
                type: "TEXT",
                maxLength: 400,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(400)",
                oldMaxLength: 400);

            migrationBuilder.AlterColumn<string>(
                name: "ErrorType",
                table: "RuntimeIncidents",
                type: "TEXT",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40);

            migrationBuilder.AlterColumn<int>(
                name: "Count",
                table: "RuntimeIncidents",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "CorrelationId",
                table: "RuntimeIncidents",
                type: "TEXT",
                maxLength: 120,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "RuntimeIncidents",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<int>(
                name: "TotalPayloadSize",
                table: "DailyToolMetrics",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<int>(
                name: "TotalExecutions",
                table: "DailyToolMetrics",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<string>(
                name: "ToolSlug",
                table: "DailyToolMetrics",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<int>(
                name: "SuccessCount",
                table: "DailyToolMetrics",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<int>(
                name: "MaxDurationMs",
                table: "DailyToolMetrics",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<int>(
                name: "FailureCount",
                table: "DailyToolMetrics",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<float>(
                name: "AvgDurationMs",
                table: "DailyToolMetrics",
                type: "REAL",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "double precision");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "DailyToolMetrics",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<string>(
                name: "Destination",
                table: "audit_outbox",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Id",
                table: "audit_outbox",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "UpdatedAtUtc",
                table: "audit_outbox",
                type: "TEXT",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<string>(
                name: "NextAttemptAtUtc",
                table: "audit_outbox",
                type: "TEXT",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<string>(
                name: "LeaseOwner",
                table: "audit_outbox",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LeaseExpiresAtUtc",
                table: "audit_outbox",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LastErrorMessage",
                table: "audit_outbox",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LastErrorCode",
                table: "audit_outbox",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LastAttemptAtUtc",
                table: "audit_outbox",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "IdempotencyKey",
                table: "audit_outbox",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "DeliveryState",
                table: "audit_outbox",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "DeliveredAtUtc",
                table: "audit_outbox",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedAtUtc",
                table: "audit_outbox",
                type: "TEXT",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<string>(
                name: "AuditEventId",
                table: "audit_outbox",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<int>(
                name: "AttemptCount",
                table: "audit_outbox",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "Action",
                table: "audit_events",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Id",
                table: "audit_events",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "UserAgent",
                table: "audit_events",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "TraceId",
                table: "audit_events",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "TenantId",
                table: "audit_events",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "TargetType",
                table: "audit_events",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "TargetId",
                table: "audit_events",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "SourceIp",
                table: "audit_events",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(IPAddress),
                oldType: "inet",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "SchemaVersion",
                table: "audit_events",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 1);

            migrationBuilder.AlterColumn<string>(
                name: "ResultStatus",
                table: "audit_events",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "RequestId",
                table: "audit_events",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PayloadHashSha256",
                table: "audit_events",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "OccurredAtUtc",
                table: "audit_events",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<int>(
                name: "HttpStatus",
                table: "audit_events",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedAtUtc",
                table: "audit_events",
                type: "TEXT",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<string>(
                name: "ActorType",
                table: "audit_events",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "ActorId",
                table: "audit_events",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Destination",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Id",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "UpdatedAtUtc",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<string>(
                name: "OutboxId",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "OperatorStatus",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: false,
                defaultValue: "open",
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "open");

            migrationBuilder.AlterColumn<string>(
                name: "OperatorNote",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "OperatorId",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "FirstFailedAtUtc",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<int>(
                name: "FinalAttemptCount",
                table: "audit_dead_letter",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "ErrorSummary",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "DeadLetteredAtUtc",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<string>(
                name: "AuditEventId",
                table: "audit_dead_letter",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "AdminAuditLogs",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "EntityType",
                table: "AdminAuditLogs",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "EntityId",
                table: "AdminAuditLogs",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "BeforeJson",
                table: "AdminAuditLogs",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AfterJson",
                table: "AdminAuditLogs",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ActionType",
                table: "AdminAuditLogs",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "AdminAuditLogs",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddForeignKey(
                name: "FK_audit_dead_letter_audit_events_AuditEventId",
                table: "audit_dead_letter",
                column: "AuditEventId",
                principalTable: "audit_events",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_audit_dead_letter_audit_outbox_OutboxId",
                table: "audit_dead_letter",
                column: "OutboxId",
                principalTable: "audit_outbox",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_audit_outbox_audit_events_AuditEventId",
                table: "audit_outbox",
                column: "AuditEventId",
                principalTable: "audit_events",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
