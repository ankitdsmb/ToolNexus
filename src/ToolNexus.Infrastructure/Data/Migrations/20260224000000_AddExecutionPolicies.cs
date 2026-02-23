using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddExecutionPolicies : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ToolExecutionPolicies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ToolDefinitionId = table.Column<int>(type: "INTEGER", nullable: false),
                    ToolSlug = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    ExecutionMode = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    TimeoutSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    MaxRequestsPerMinute = table.Column<int>(type: "INTEGER", nullable: false),
                    MaxInputSize = table.Column<int>(type: "INTEGER", nullable: false),
                    IsExecutionEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    RowVersion = table.Column<byte[]>(nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolExecutionPolicies", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ToolExecutionPolicies_ToolDefinitionId",
                table: "ToolExecutionPolicies",
                column: "ToolDefinitionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ToolExecutionPolicies_ToolSlug",
                table: "ToolExecutionPolicies",
                column: "ToolSlug",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ToolExecutionPolicies");
        }
    }
}
