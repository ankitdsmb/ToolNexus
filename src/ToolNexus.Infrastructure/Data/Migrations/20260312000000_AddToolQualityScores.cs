using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddToolQualityScores : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tool_quality_scores",
                columns: table => new
                {
                    tool_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    timestamp_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    score = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    architecture_score = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    test_coverage_score = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    craft_score = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tool_quality_scores", x => new { x.tool_id, x.timestamp_utc });
                });

            migrationBuilder.CreateIndex(
                name: "idx_tool_quality_scores_timestamp_utc",
                table: "tool_quality_scores",
                column: "timestamp_utc");

            migrationBuilder.CreateIndex(
                name: "idx_tool_quality_scores_tool_id",
                table: "tool_quality_scores",
                column: "tool_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tool_quality_scores");
        }
    }
}
