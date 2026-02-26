using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddOperatorCommandsLedger : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "operator_commands",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    command = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    executed_by = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    timestamp_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    result = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    rollback_info = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    impact_scope = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    authority_context = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operator_commands", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_operator_commands_correlation_id",
                table: "operator_commands",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_operator_commands_timestamp_utc",
                table: "operator_commands",
                column: "timestamp_utc",
                descending: new[] { true });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "operator_commands");
        }
    }
}
