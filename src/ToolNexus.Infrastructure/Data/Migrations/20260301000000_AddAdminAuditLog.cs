using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ToolNexusContentDbContext))]
    [Migration("20260301000000_AddAdminAuditLog")]
    public partial class AddAdminAuditLog : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdminAuditLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    ActionType = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    EntityType = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    EntityId = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    BeforeJson = table.Column<string>(type: "TEXT", nullable: true),
                    AfterJson = table.Column<string>(type: "TEXT", nullable: true),
                    TimestampUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdminAuditLogs_TimestampUtc",
                table: "AdminAuditLogs",
                column: "TimestampUtc");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AdminAuditLogs");
        }
    }
}
