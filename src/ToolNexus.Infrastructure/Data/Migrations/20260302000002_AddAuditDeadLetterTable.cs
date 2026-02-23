using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddAuditDeadLetterTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_dead_letter",
                columns: table => new
                {
                    id = table.Column<Guid>(nullable: false),
                    outbox_id = table.Column<Guid>(nullable: false),
                    audit_event_id = table.Column<Guid>(nullable: false),
                    destination = table.Column<string>(nullable: false),
                    final_attempt_count = table.Column<int>(nullable: false),
                    first_failed_at_utc = table.Column<DateTime>(nullable: false),
                    dead_lettered_at_utc = table.Column<DateTime>(nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    error_summary = table.Column<string>(nullable: false),
                    error_details = table.Column<string>(nullable: true),
                    operator_status = table.Column<string>(nullable: false, defaultValue: "open"),
                    operator_note = table.Column<string>(nullable: true),
                    operator_id = table.Column<string>(nullable: true),
                    updated_at_utc = table.Column<DateTime>(nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_dead_letter", x => x.id);
                    table.ForeignKey("FK_audit_dead_letter_audit_events_audit_event_id", x => x.audit_event_id, "audit_events", "id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey("FK_audit_dead_letter_audit_outbox_outbox_id", x => x.outbox_id, "audit_outbox", "id", onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex("IX_audit_dead_letter_outbox_id", "audit_dead_letter", "outbox_id", unique: true);
            migrationBuilder.CreateIndex("idx_audit_dead_letter_status_time", "audit_dead_letter", new[] { "operator_status", "dead_lettered_at_utc" });
            migrationBuilder.CreateIndex("idx_audit_dead_letter_destination", "audit_dead_letter", new[] { "destination", "dead_lettered_at_utc" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("audit_dead_letter");
        }
    }
}
