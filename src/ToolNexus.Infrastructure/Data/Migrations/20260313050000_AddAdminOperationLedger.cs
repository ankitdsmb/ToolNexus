using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    [Migration("20260313050000_AddAdminOperationLedger")]
    public partial class AddAdminOperationLedger : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "admin_operation_ledger",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operation_domain = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    operation_name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    requested_by = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    result_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false),
                    executed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_operation_ledger", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_admin_operation_ledger_correlation_id",
                table: "admin_operation_ledger",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "idx_admin_operation_ledger_executed_at",
                table: "admin_operation_ledger",
                column: "executed_at_utc",
                descending: new[] { true });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_operation_ledger");
        }
    }
}
