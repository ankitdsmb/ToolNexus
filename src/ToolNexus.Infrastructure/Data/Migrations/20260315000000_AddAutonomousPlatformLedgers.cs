using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddAutonomousPlatformLedgers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "platform_signals",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    signal_type = table.Column<string>(maxLength: 80, nullable: false),
                    source_domain = table.Column<string>(maxLength: 80, nullable: false),
                    severity = table.Column<string>(maxLength: 24, nullable: false),
                    detected_at_utc = table.Column<DateTime>(nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    correlation_id = table.Column<string>(maxLength: 100, nullable: false),
                    recommended_action_type = table.Column<string>(maxLength: 80, nullable: false),
                    tenant_id = table.Column<string>(maxLength: 80, nullable: false),
                    authority_context = table.Column<string>(maxLength: 80, nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_platform_signals", x => x.Id));

            migrationBuilder.CreateTable(
                name: "platform_insights",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    related_signal_ids = table.Column<string>(type: "jsonb", nullable: false),
                    recommended_action = table.Column<string>(maxLength: 400, nullable: false),
                    impact_scope = table.Column<string>(maxLength: 120, nullable: false),
                    risk_score = table.Column<decimal>(nullable: false),
                    confidence_score = table.Column<decimal>(nullable: false),
                    status = table.Column<string>(maxLength: 24, nullable: false),
                    correlation_id = table.Column<string>(maxLength: 100, nullable: false),
                    authority_context = table.Column<string>(maxLength: 80, nullable: false),
                    created_at_utc = table.Column<DateTime>(nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    decisioned_at_utc = table.Column<DateTime>(nullable: true),
                    decisioned_by = table.Column<string>(maxLength: 120, nullable: true)
                },
                constraints: table => table.PrimaryKey("PK_platform_insights", x => x.Id));

            migrationBuilder.CreateTable(
                name: "operator_approved_actions",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    insight_id = table.Column<Guid>(nullable: false),
                    operator_id = table.Column<string>(maxLength: 120, nullable: false),
                    decision = table.Column<string>(maxLength: 24, nullable: false),
                    authority_context = table.Column<string>(maxLength: 80, nullable: false),
                    correlation_id = table.Column<string>(maxLength: 100, nullable: false),
                    action_type = table.Column<string>(maxLength: 120, nullable: false),
                    notes = table.Column<string>(maxLength: 1000, nullable: true),
                    timestamp_utc = table.Column<DateTime>(nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table => table.PrimaryKey("PK_operator_approved_actions", x => x.Id));

            migrationBuilder.CreateIndex("idx_platform_signals_correlation", "platform_signals", "correlation_id");
            migrationBuilder.CreateIndex("idx_platform_signals_tenant", "platform_signals", "tenant_id");
            migrationBuilder.CreateIndex("idx_platform_signals_detected_at", "platform_signals", "detected_at_utc");
            migrationBuilder.CreateIndex("idx_platform_insights_correlation", "platform_insights", "correlation_id");
            migrationBuilder.CreateIndex("idx_platform_insights_created_at", "platform_insights", "created_at_utc");
            migrationBuilder.CreateIndex("idx_platform_insights_status", "platform_insights", "status");
            migrationBuilder.CreateIndex("idx_operator_approved_actions_correlation", "operator_approved_actions", "correlation_id");
            migrationBuilder.CreateIndex("idx_operator_approved_actions_timestamp", "operator_approved_actions", "timestamp_utc");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "operator_approved_actions");
            migrationBuilder.DropTable(name: "platform_insights");
            migrationBuilder.DropTable(name: "platform_signals");
        }
    }
}
