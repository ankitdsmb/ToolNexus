using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ToolNexusContentDbContext))]
    [Migration("20260302000003_AddAuditStateCheckConstraints")]
    public partial class AddAuditStateCheckConstraints : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("Sqlite"))
            {
                return;
            }

            migrationBuilder.Sql("ALTER TABLE audit_events ADD CONSTRAINT ck_audit_events_result_status CHECK (result_status IN ('success','failure','partial'));");
            migrationBuilder.Sql("ALTER TABLE audit_outbox ADD CONSTRAINT ck_audit_outbox_delivery_state CHECK (delivery_state IN ('pending','in_progress','retry_wait','delivered','dead_lettered'));");
            migrationBuilder.Sql("ALTER TABLE audit_dead_letter ADD CONSTRAINT ck_audit_dead_letter_operator_status CHECK (operator_status IN ('open','requeued','ignored','resolved'));");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("Sqlite"))
            {
                return;
            }

            migrationBuilder.Sql("ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS ck_audit_events_result_status;");
            migrationBuilder.Sql("ALTER TABLE audit_outbox DROP CONSTRAINT IF EXISTS ck_audit_outbox_delivery_state;");
            migrationBuilder.Sql("ALTER TABLE audit_dead_letter DROP CONSTRAINT IF EXISTS ck_audit_dead_letter_operator_status;");
        }
    }
}
