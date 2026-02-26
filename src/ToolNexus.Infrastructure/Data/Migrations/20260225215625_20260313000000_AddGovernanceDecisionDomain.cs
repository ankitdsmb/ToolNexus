using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class _20260313000000_AddGovernanceDecisionDomain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "governance_decision_id",
                table: "execution_snapshots",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "governance_decisions",
                columns: table => new
                {
                    decision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tool_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    capability_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    authority = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    approved_by = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    decision_reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    policy_version = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    timestamp_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_governance_decisions", x => x.decision_id);
                });

            migrationBuilder.Sql("""
                DO $$
                DECLARE
                    snapshot_id_column text;
                    run_id_column text;
                BEGIN
                    IF to_regclass('execution_snapshots') IS NULL
                       OR to_regclass('execution_runs') IS NULL
                       OR to_regclass('governance_decisions') IS NULL
                    THEN
                        RETURN;
                    END IF;

                    SELECT CASE
                        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'execution_snapshots' AND column_name = 'id') THEN 'id'
                        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'execution_snapshots' AND column_name = 'execution_snapshot_id') THEN 'execution_snapshot_id'
                        ELSE NULL
                    END INTO snapshot_id_column;

                    IF snapshot_id_column IS NULL OR NOT EXISTS (
                        SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'execution_snapshots' AND column_name = 'execution_run_id')
                    THEN
                        RETURN;
                    END IF;

                    SELECT CASE
                        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'execution_runs' AND column_name = 'id') THEN 'id'
                        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'execution_runs' AND column_name = 'execution_run_id') THEN 'execution_run_id'
                        ELSE NULL
                    END INTO run_id_column;

                    IF run_id_column IS NULL THEN
                        RETURN;
                    END IF;

                    EXECUTE format($sql$
                        INSERT INTO governance_decisions (
                            decision_id,
                            tool_id,
                            capability_id,
                            authority,
                            approved_by,
                            decision_reason,
                            policy_version,
                            timestamp_utc,
                            status)
                        SELECT
                            es.%1$I,
                            er.tool_id,
                            COALESCE(es.execution_capability, 'standard'),
                            COALESCE(es.authority, er.authority, 'Unknown'),
                            'server',
                            'LegacyMigrationBackfill',
                            COALESCE(es.conformance_version, 'legacy'),
                            COALESCE(es.timestamp_utc, er.executed_at_utc),
                            'Approved'
                        FROM execution_snapshots es
                        INNER JOIN execution_runs er ON er.%2$I = es.execution_run_id
                        WHERE NOT EXISTS (
                            SELECT 1 FROM governance_decisions gd WHERE gd.decision_id = es.%1$I);
                        $sql$, snapshot_id_column, run_id_column);

                    EXECUTE format($sql$
                        UPDATE execution_snapshots es
                        SET governance_decision_id = es.%1$I
                        WHERE es.governance_decision_id IS NULL
                          AND EXISTS (
                              SELECT 1
                              FROM governance_decisions gd
                              WHERE gd.decision_id = es.%1$I);
                        $sql$, snapshot_id_column);
                END $$;
                """);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF to_regclass('execution_snapshots') IS NOT NULL
                       AND EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = current_schema()
                              AND table_name = 'execution_snapshots'
                              AND column_name = 'governance_decision_id')
                       AND NOT EXISTS (
                            SELECT 1
                            FROM execution_snapshots
                            WHERE governance_decision_id IS NULL)
                    THEN
                        ALTER TABLE execution_snapshots
                        ALTER COLUMN governance_decision_id SET NOT NULL;
                    END IF;
                END $$;
                """);

            migrationBuilder.CreateIndex(
                name: "idx_execution_snapshots_governance_decision_id",
                table: "execution_snapshots",
                column: "governance_decision_id");

            migrationBuilder.CreateIndex(
                name: "idx_governance_decisions_policy_version",
                table: "governance_decisions",
                column: "policy_version");

            migrationBuilder.CreateIndex(
                name: "idx_governance_decisions_timestamp_utc",
                table: "governance_decisions",
                column: "timestamp_utc");

            migrationBuilder.CreateIndex(
                name: "idx_governance_decisions_tool_id",
                table: "governance_decisions",
                column: "tool_id");

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF to_regclass('execution_snapshots') IS NOT NULL
                       AND to_regclass('governance_decisions') IS NOT NULL
                       AND NOT EXISTS (
                            SELECT 1
                            FROM execution_snapshots es
                            LEFT JOIN governance_decisions gd
                              ON gd.decision_id = es.governance_decision_id
                            WHERE es.governance_decision_id IS NOT NULL
                              AND gd.decision_id IS NULL)
                    THEN
                        ALTER TABLE execution_snapshots
                        ADD CONSTRAINT "FK_execution_snapshots_governance_decisions_governance_decision_id"
                        FOREIGN KEY (governance_decision_id)
                        REFERENCES governance_decisions (decision_id)
                        ON DELETE RESTRICT;
                    END IF;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.SafeDropConstraintIfExists(
                tableName: "execution_snapshots",
                constraintName: "FK_execution_snapshots_governance_decisions_governance_decision_id");

            migrationBuilder.DropTable(
                name: "governance_decisions");

            migrationBuilder.SafeDropIndexIfExists(
                tableName: "execution_snapshots",
                indexName: "idx_execution_snapshots_governance_decision_id");

            migrationBuilder.DropColumn(
                name: "governance_decision_id",
                table: "execution_snapshots");
        }
    }
}
