using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddIntelligenceGraphFoundation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "intelligence_nodes",
                columns: table => new
                {
                    NodeId = table.Column<Guid>(nullable: false),
                    node_type = table.Column<string>(maxLength: 64, nullable: false),
                    external_ref = table.Column<string>(maxLength: 160, nullable: false),
                    display_name = table.Column<string>(maxLength: 200, nullable: false),
                    lifecycle_state = table.Column<string>(maxLength: 40, nullable: false),
                    lifecycle_version = table.Column<string>(maxLength: 32, nullable: false),
                    confidence_band = table.Column<string>(maxLength: 32, nullable: false),
                    tenant_id = table.Column<string>(maxLength: 120, nullable: false),
                    correlation_id = table.Column<string>(maxLength: 120, nullable: false),
                    context_tags_json = table.Column<string>(type: "jsonb", nullable: false),
                    properties_json = table.Column<string>(type: "jsonb", nullable: false),
                    observed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    retired_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intelligence_nodes", x => x.NodeId);
                });

            migrationBuilder.CreateTable(
                name: "intelligence_snapshots",
                columns: table => new
                {
                    SnapshotId = table.Column<Guid>(nullable: false),
                    snapshot_type = table.Column<string>(maxLength: 40, nullable: false),
                    lifecycle_version = table.Column<string>(maxLength: 32, nullable: false),
                    tenant_id = table.Column<string>(maxLength: 120, nullable: false),
                    correlation_id = table.Column<string>(maxLength: 120, nullable: false),
                    snapshot_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    node_count_by_type_json = table.Column<string>(type: "jsonb", nullable: false),
                    edge_count_by_type_json = table.Column<string>(type: "jsonb", nullable: false),
                    integrity_status = table.Column<string>(maxLength: 40, nullable: false),
                    notes = table.Column<string>(maxLength: 1000, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intelligence_snapshots", x => x.SnapshotId);
                });

            migrationBuilder.CreateTable(
                name: "intelligence_edges",
                columns: table => new
                {
                    EdgeId = table.Column<Guid>(nullable: false),
                    SourceNodeId = table.Column<Guid>(nullable: false),
                    TargetNodeId = table.Column<Guid>(nullable: false),
                    relationship_type = table.Column<string>(maxLength: 64, nullable: false),
                    lifecycle_version = table.Column<string>(maxLength: 32, nullable: false),
                    confidence_score = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    tenant_id = table.Column<string>(maxLength: 120, nullable: false),
                    correlation_id = table.Column<string>(maxLength: 120, nullable: false),
                    context_tags_json = table.Column<string>(type: "jsonb", nullable: false),
                    metadata_json = table.Column<string>(type: "jsonb", nullable: false),
                    effective_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    superseded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intelligence_edges", x => x.EdgeId);
                    table.ForeignKey(
                        name: "FK_intelligence_edges_intelligence_nodes_SourceNodeId",
                        column: x => x.SourceNodeId,
                        principalTable: "intelligence_nodes",
                        principalColumn: "NodeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_intelligence_edges_intelligence_nodes_TargetNodeId",
                        column: x => x.TargetNodeId,
                        principalTable: "intelligence_nodes",
                        principalColumn: "NodeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_nodes_correlation_id",
                table: "intelligence_nodes",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_nodes_tenant_id",
                table: "intelligence_nodes",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_nodes_observed_at",
                table: "intelligence_nodes",
                column: "observed_at_utc");

            migrationBuilder.CreateIndex(
                name: "ux_intelligence_nodes_type_external_lifecycle",
                table: "intelligence_nodes",
                columns: new[] { "node_type", "external_ref", "lifecycle_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_edges_correlation_id",
                table: "intelligence_edges",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_edges_tenant_id",
                table: "intelligence_edges",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_edges_recorded_at",
                table: "intelligence_edges",
                column: "recorded_at_utc");

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_edges_effective_at",
                table: "intelligence_edges",
                column: "effective_at_utc");

            migrationBuilder.CreateIndex(
                name: "IX_intelligence_edges_SourceNodeId",
                table: "intelligence_edges",
                column: "SourceNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_intelligence_edges_TargetNodeId",
                table: "intelligence_edges",
                column: "TargetNodeId");

            migrationBuilder.CreateIndex(
                name: "ux_intelligence_edges_source_target_type_lifecycle",
                table: "intelligence_edges",
                columns: new[] { "SourceNodeId", "TargetNodeId", "relationship_type", "lifecycle_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_snapshots_correlation_id",
                table: "intelligence_snapshots",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_snapshots_tenant_id",
                table: "intelligence_snapshots",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "idx_intelligence_snapshots_snapshot_at",
                table: "intelligence_snapshots",
                column: "snapshot_at_utc");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "intelligence_edges");
            migrationBuilder.DropTable(name: "intelligence_snapshots");
            migrationBuilder.DropTable(name: "intelligence_nodes");
        }
    }
}
