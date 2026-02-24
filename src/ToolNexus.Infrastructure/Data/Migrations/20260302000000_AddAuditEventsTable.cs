using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ToolNexusContentDbContext))]
    [Migration("20260302000000_AddAuditEventsTable")]
    public partial class AddAuditEventsTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_events",
                columns: table => new
                {
                    id = table.Column<Guid>(nullable: false),
                    occurred_at_utc = table.Column<DateTime>(nullable: false),
                    actor_type = table.Column<string>(nullable: false),
                    actor_id = table.Column<string>(nullable: true),
                    tenant_id = table.Column<string>(nullable: true),
                    trace_id = table.Column<string>(nullable: true),
                    request_id = table.Column<string>(nullable: true),
                    action = table.Column<string>(nullable: false),
                    target_type = table.Column<string>(nullable: true),
                    target_id = table.Column<string>(nullable: true),
                    result_status = table.Column<string>(nullable: false),
                    http_status = table.Column<int>(nullable: true),
                    source_ip = table.Column<string>(nullable: true),
                    user_agent = table.Column<string>(nullable: true),
                    payload_redacted = table.Column<string>(nullable: false),
                    payload_hash_sha256 = table.Column<string>(nullable: false),
                    schema_version = table.Column<int>(nullable: false, defaultValue: 1),
                    created_at_utc = table.Column<DateTime>(nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table => { table.PrimaryKey("PK_audit_events", x => x.id); });

            migrationBuilder.CreateIndex("idx_audit_events_occurred_at", "audit_events", "occurred_at_utc");
            migrationBuilder.CreateIndex("idx_audit_events_actor", "audit_events", new[] { "actor_type", "actor_id", "occurred_at_utc" });
            migrationBuilder.CreateIndex("idx_audit_events_action", "audit_events", new[] { "action", "occurred_at_utc" });
            migrationBuilder.CreateIndex("idx_audit_events_tenant", "audit_events", new[] { "tenant_id", "occurred_at_utc" }, filter: "tenant_id IS NOT NULL");
            migrationBuilder.CreateIndex("idx_audit_events_trace", "audit_events", "trace_id", filter: "trace_id IS NOT NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("audit_events");
        }
    }
}
