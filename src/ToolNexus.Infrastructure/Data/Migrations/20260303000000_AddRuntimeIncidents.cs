using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ToolNexusContentDbContext))]
    [Migration("20260303000000_AddRuntimeIncidents")]
    public partial class AddRuntimeIncidents : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RuntimeIncidents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Fingerprint = table.Column<string>(type: "TEXT", maxLength: 400, nullable: false),
                    ToolSlug = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Phase = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    ErrorType = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    Message = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    Stack = table.Column<string>(type: "TEXT", nullable: true),
                    PayloadType = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Severity = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Count = table.Column<int>(type: "INTEGER", nullable: false),
                    FirstOccurredUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastOccurredUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RuntimeIncidents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RuntimeIncidents_Fingerprint",
                table: "RuntimeIncidents",
                column: "Fingerprint",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RuntimeIncidents_LastOccurredUtc",
                table: "RuntimeIncidents",
                column: "LastOccurredUtc");

            migrationBuilder.CreateIndex(
                name: "IX_RuntimeIncidents_ToolSlug",
                table: "RuntimeIncidents",
                column: "ToolSlug");

            if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                migrationBuilder.SafeEnsureIdentityByDefaultIfMissing("RuntimeIncidents");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RuntimeIncidents");
        }
    }
}
