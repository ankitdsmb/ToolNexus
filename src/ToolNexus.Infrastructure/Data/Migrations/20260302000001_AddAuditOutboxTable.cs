using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddAuditOutboxTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_outbox",
                columns: table => new
                {
                    id = table.Column<Guid>(nullable: false),
                    audit_event_id = table.Column<Guid>(nullable: false),
                    destination = table.Column<string>(nullable: false),
                    idempotency_key = table.Column<string>(nullable: false),
                    delivery_state = table.Column<string>(nullable: false),
                    attempt_count = table.Column<int>(nullable: false, defaultValue: 0),
                    next_attempt_at_utc = table.Column<DateTime>(nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    last_error_code = table.Column<string>(nullable: true),
                    last_error_message = table.Column<string>(nullable: true),
                    last_attempt_at_utc = table.Column<DateTime>(nullable: true),
                    delivered_at_utc = table.Column<DateTime>(nullable: true),
                    lease_owner = table.Column<string>(nullable: true),
                    lease_expires_at_utc = table.Column<DateTime>(nullable: true),
                    created_at_utc = table.Column<DateTime>(nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at_utc = table.Column<DateTime>(nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_outbox", x => x.id);
                    table.ForeignKey("FK_audit_outbox_audit_events_audit_event_id", x => x.audit_event_id, "audit_events", "id", onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex("ux_audit_outbox_destination_event", "audit_outbox", new[] { "destination", "audit_event_id" }, unique: true);
            migrationBuilder.CreateIndex("ux_audit_outbox_idempotency_key", "audit_outbox", "idempotency_key", unique: true);
            migrationBuilder.CreateIndex("idx_audit_outbox_sched", "audit_outbox", new[] { "delivery_state", "next_attempt_at_utc" });
            migrationBuilder.CreateIndex("idx_audit_outbox_lease", "audit_outbox", "lease_expires_at_utc", filter: "delivery_state = 'in_progress'");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("audit_outbox");
        }
    }
}
