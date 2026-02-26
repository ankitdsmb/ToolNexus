using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddArchitectureEvolutionEngine : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "architecture_evolution_signals",
                columns: table => new
                {
                    signal_id = table.Column<Guid>(type: "uuid", nullable: false),
                    signal_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    source_domain = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    severity_score = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    tenant_id = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    runtime_identity = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    detected_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table => { table.PrimaryKey("PK_architecture_evolution_signals", x => x.signal_id); });

            migrationBuilder.CreateTable(
                name: "architecture_drift_reports",
                columns: table => new
                {
                    drift_report_id = table.Column<Guid>(type: "uuid", nullable: false),
                    drift_type = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    affected_domain = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    drift_score = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    risk_level = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    tenant_id = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    indicators_json = table.Column<string>(type: "jsonb", nullable: false),
                    detected_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table => { table.PrimaryKey("PK_architecture_drift_reports", x => x.drift_report_id); });

            migrationBuilder.CreateTable(
                name: "evolution_recommendations",
                columns: table => new
                {
                    recommendation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    affected_domain = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    architecture_impact_level = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    risk_level = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    confidence_score = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    estimated_migration_cost = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    expected_platform_benefit = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    backward_compatibility_impact = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    suggested_phases = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    rollback_strategy = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    tenant_id = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    generated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table => { table.PrimaryKey("PK_evolution_recommendations", x => x.recommendation_id); });

            migrationBuilder.CreateTable(
                name: "evolution_simulation_reports",
                columns: table => new
                {
                    simulation_report_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recommendation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    execution_flow_impact = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    governance_flow_impact = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    data_model_impact = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    migration_complexity = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    simulated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table => { table.PrimaryKey("PK_evolution_simulation_reports", x => x.simulation_report_id); });

            migrationBuilder.CreateTable(
                name: "architect_decisions",
                columns: table => new
                {
                    decision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recommendation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    architect_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    tenant_id = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    decisioned_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table => { table.PrimaryKey("PK_architect_decisions", x => x.decision_id); });

            migrationBuilder.CreateIndex(name: "idx_architecture_evolution_signals_correlation_id", table: "architecture_evolution_signals", column: "correlation_id");
            migrationBuilder.CreateIndex(name: "idx_architecture_evolution_signals_tenant_id", table: "architecture_evolution_signals", column: "tenant_id");
            migrationBuilder.CreateIndex(name: "idx_architecture_evolution_signals_detected_at", table: "architecture_evolution_signals", column: "detected_at_utc");

            migrationBuilder.CreateIndex(name: "idx_architecture_drift_reports_correlation_id", table: "architecture_drift_reports", column: "correlation_id");
            migrationBuilder.CreateIndex(name: "idx_architecture_drift_reports_tenant_id", table: "architecture_drift_reports", column: "tenant_id");
            migrationBuilder.CreateIndex(name: "idx_architecture_drift_reports_detected_at", table: "architecture_drift_reports", column: "detected_at_utc");

            migrationBuilder.CreateIndex(name: "idx_evolution_recommendations_correlation_id", table: "evolution_recommendations", column: "correlation_id");
            migrationBuilder.CreateIndex(name: "idx_evolution_recommendations_tenant_id", table: "evolution_recommendations", column: "tenant_id");
            migrationBuilder.CreateIndex(name: "idx_evolution_recommendations_generated_at", table: "evolution_recommendations", column: "generated_at_utc");

            migrationBuilder.CreateIndex(name: "idx_evolution_simulation_reports_recommendation_id", table: "evolution_simulation_reports", column: "recommendation_id");
            migrationBuilder.CreateIndex(name: "idx_evolution_simulation_reports_simulated_at", table: "evolution_simulation_reports", column: "simulated_at_utc");

            migrationBuilder.CreateIndex(name: "idx_architect_decisions_correlation_id", table: "architect_decisions", column: "correlation_id");
            migrationBuilder.CreateIndex(name: "idx_architect_decisions_tenant_id", table: "architect_decisions", column: "tenant_id");
            migrationBuilder.CreateIndex(name: "idx_architect_decisions_decisioned_at", table: "architect_decisions", column: "decisioned_at_utc");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "architect_decisions");
            migrationBuilder.DropTable(name: "evolution_simulation_reports");
            migrationBuilder.DropTable(name: "evolution_recommendations");
            migrationBuilder.DropTable(name: "architecture_drift_reports");
            migrationBuilder.DropTable(name: "architecture_evolution_signals");
        }
    }
}
