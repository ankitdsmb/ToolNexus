using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddToolSubmissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tool_submissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    author_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false, defaultValue: "pending"),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    manifest = table.Column<string>(type: "jsonb", nullable: false),
                    schema = table.Column<string>(type: "jsonb", nullable: false),
                    runtime_module = table.Column<string>(type: "text", nullable: false),
                    template = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tool_submissions", x => x.id);
                    table.CheckConstraint("CK_tool_submissions_status", "status IN ('pending', 'approved', 'rejected')");
                });

            migrationBuilder.CreateIndex(
                name: "IX_tool_submissions_slug",
                table: "tool_submissions",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tool_submissions_status",
                table: "tool_submissions",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tool_submissions");
        }
    }
}
