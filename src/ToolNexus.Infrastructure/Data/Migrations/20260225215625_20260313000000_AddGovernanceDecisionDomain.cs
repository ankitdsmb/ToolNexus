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
                    es.id,
                    er.tool_id,
                    COALESCE(es.execution_capability, 'standard'),
                    COALESCE(es.authority, er.authority, 'Unknown'),
                    'server',
                    'LegacyMigrationBackfill',
                    COALESCE(es.conformance_version, 'legacy'),
                    COALESCE(es.timestamp_utc, er.executed_at_utc),
                    'Approved'
                FROM execution_snapshots es
                INNER JOIN execution_runs er ON er.id = es.execution_run_id;
                """);

            migrationBuilder.Sql("""
                UPDATE execution_snapshots
                SET governance_decision_id = id
                WHERE governance_decision_id IS NULL;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "governance_decision_id",
                table: "execution_snapshots",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

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

            migrationBuilder.AddForeignKey(
                name: "FK_execution_snapshots_governance_decisions_governance_decision_id",
                table: "execution_snapshots",
                column: "governance_decision_id",
                principalTable: "governance_decisions",
                principalColumn: "decision_id",
                onDelete: ReferentialAction.Restrict);
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
