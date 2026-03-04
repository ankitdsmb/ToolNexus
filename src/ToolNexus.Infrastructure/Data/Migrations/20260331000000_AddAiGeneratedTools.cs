using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiGeneratedTools : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_generated_tools",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt = table.Column<string>(type: "text", nullable: false),
                    schema = table.Column<string>(type: "jsonb", nullable: false),
                    manifest = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false, defaultValue: "draft")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_generated_tools", x => x.id);
                    table.CheckConstraint("CK_ai_generated_tools_status", "status IN ('draft', 'approved')");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_generated_tools_status",
                table: "ai_generated_tools",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_generated_tools");
        }
    }
}
