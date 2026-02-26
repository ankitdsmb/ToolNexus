using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddPlatformOptimizationLedgers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "optimization_recommendations",
                columns: table => new
                {
                    recommendation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    domain = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    target_node_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    confidence_score = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    suggested_change = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    risk_impact = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    expected_benefit = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    tenant_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    rollback_metadata = table.Column<string>(type: "jsonb", nullable: false),
                    generated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table => { table.PrimaryKey("PK_optimization_recommendations", x => x.recommendation_id); });

            migrationBuilder.CreateTable(
                name: "optimization_simulations",
                columns: table => new
                {
                    simulation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recommendation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    simulation_summary = table.Column<string>(type: "character varying(3000)", maxLength: 3000, nullable: false),
                    projected_risk_delta = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    projected_benefit_delta = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    approved_for_review = table.Column<bool>(type: "boolean", nullable: false),
                    source_snapshot_ids = table.Column<string>(type: "jsonb", nullable: false),
                    synthetic_workload_ref = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    governance_replay_ref = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    simulated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table => { table.PrimaryKey("PK_optimization_simulations", x => x.simulation_id); });

            migrationBuilder.CreateTable(
                name: "optimization_applications",
                columns: table => new
                {
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recommendation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    operator_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    authority_context = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    scheduled_for_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    applied_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table => { table.PrimaryKey("PK_optimization_applications", x => x.application_id); });

            migrationBuilder.CreateTable(
                name: "optimization_outcomes",
                columns: table => new
                {
                    outcome_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recommendation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    outcome_status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    benefit_realized = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    risk_realized = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    measured_by = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    measured_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table => { table.PrimaryKey("PK_optimization_outcomes", x => x.outcome_id); });

            migrationBuilder.CreateIndex("idx_optimization_recommendations_correlation", "optimization_recommendations", "correlation_id");
            migrationBuilder.CreateIndex("idx_optimization_recommendations_tenant", "optimization_recommendations", "tenant_id");
            migrationBuilder.CreateIndex("idx_optimization_recommendations_generated_at", "optimization_recommendations", "generated_at_utc");
            migrationBuilder.CreateIndex("idx_optimization_simulations_recommendation", "optimization_simulations", "recommendation_id");
            migrationBuilder.CreateIndex("idx_optimization_simulations_simulated_at", "optimization_simulations", "simulated_at_utc");
            migrationBuilder.CreateIndex("idx_optimization_applications_recommendation", "optimization_applications", "recommendation_id");
            migrationBuilder.CreateIndex("idx_optimization_applications_applied_at", "optimization_applications", "applied_at_utc");
            migrationBuilder.CreateIndex("idx_optimization_outcomes_recommendation", "optimization_outcomes", "recommendation_id");
            migrationBuilder.CreateIndex("idx_optimization_outcomes_measured_at", "optimization_outcomes", "measured_at_utc");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "optimization_outcomes");
            migrationBuilder.DropTable(name: "optimization_applications");
            migrationBuilder.DropTable(name: "optimization_simulations");
            migrationBuilder.DropTable(name: "optimization_recommendations");
        }
    }
}
