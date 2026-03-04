using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations;

public partial class AddToolSubmissionReviewColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "reviewedBy",
            table: "tool_submissions",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "reviewedAt",
            table: "tool_submissions",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "reviewNotes",
            table: "tool_submissions",
            type: "text",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "reviewedBy",
            table: "tool_submissions");

        migrationBuilder.DropColumn(
            name: "reviewedAt",
            table: "tool_submissions");

        migrationBuilder.DropColumn(
            name: "reviewNotes",
            table: "tool_submissions");
    }
}
