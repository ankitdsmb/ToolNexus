using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ToolNexusContentDbContext))]
    [Migration("20260225000000_AddToolExecutionEvents")]
    public partial class AddToolExecutionEvents : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ToolExecutionEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ToolSlug = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    TimestampUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DurationMs = table.Column<long>(type: "INTEGER", nullable: false),
                    Success = table.Column<bool>(type: "INTEGER", nullable: false),
                    ErrorType = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    PayloadSize = table.Column<int>(type: "INTEGER", nullable: false),
                    ExecutionMode = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolExecutionEvents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ToolExecutionEvents_TimestampUtc",
                table: "ToolExecutionEvents",
                column: "TimestampUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ToolExecutionEvents_ToolSlug",
                table: "ToolExecutionEvents",
                column: "ToolSlug");

            if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                migrationBuilder.SafeEnsureIdentityByDefaultIfMissing("ToolExecutionEvents");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ToolExecutionEvents");
        }
    }
}
