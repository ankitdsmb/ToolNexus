using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCssScanTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "css_scan_jobs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    error_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    started_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    scan_duration_ms = table.Column<int>(type: "integer", nullable: true),
                    pages_scanned = table.Column<int>(type: "integer", nullable: false),
                    job_metadata_json = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_css_scan_jobs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "css_scan_results",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    job_id = table.Column<Guid>(type: "uuid", nullable: false),
                    total_css_bytes = table.Column<int>(type: "integer", nullable: false),
                    used_css_bytes = table.Column<int>(type: "integer", nullable: false),
                    unused_css_bytes = table.Column<int>(type: "integer", nullable: false),
                    optimization_potential = table.Column<double>(type: "double precision", nullable: false),
                    framework = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    framework_detection_json = table.Column<string>(type: "jsonb", nullable: true),
                    optimized_css = table.Column<string>(type: "text", nullable: true),
                    result_payload_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_css_scan_results", x => x.id);
                    table.ForeignKey(
                        name: "FK_css_scan_results_css_scan_jobs_job_id",
                        column: x => x.job_id,
                        principalTable: "css_scan_jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "css_artifacts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    result_id = table.Column<Guid>(type: "uuid", nullable: false),
                    artifact_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    file_path = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    content_type = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    file_name = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_css_artifacts", x => x.id);
                    table.ForeignKey(
                        name: "FK_css_artifacts_css_scan_results_result_id",
                        column: x => x.result_id,
                        principalTable: "css_scan_results",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "css_selector_metrics",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    result_id = table.Column<Guid>(type: "uuid", nullable: false),
                    selector = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_used = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_css_selector_metrics", x => x.id);
                    table.ForeignKey(
                        name: "FK_css_selector_metrics_css_scan_results_result_id",
                        column: x => x.result_id,
                        principalTable: "css_scan_results",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_css_artifacts_result_id",
                table: "css_artifacts",
                column: "result_id");

            migrationBuilder.CreateIndex(
                name: "IX_css_scan_jobs_status",
                table: "css_scan_jobs",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_css_scan_results_job_id",
                table: "css_scan_results",
                column: "job_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_css_selector_metrics_result_id",
                table: "css_selector_metrics",
                column: "result_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "css_artifacts");

            migrationBuilder.DropTable(
                name: "css_selector_metrics");

            migrationBuilder.DropTable(
                name: "css_scan_results");

            migrationBuilder.DropTable(
                name: "css_scan_jobs");
        }
    }
}
