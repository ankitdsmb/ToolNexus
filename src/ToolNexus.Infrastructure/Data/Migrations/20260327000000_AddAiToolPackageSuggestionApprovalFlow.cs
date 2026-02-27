using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddAiToolPackageSuggestionApprovalFlow : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                migrationBuilder.Sql("ALTER TABLE \"AiToolPackages\" ADD COLUMN IF NOT EXISTS \"ApprovalStatus\" character varying(24) NOT NULL DEFAULT 'Draft';");
                migrationBuilder.Sql("ALTER TABLE \"AiToolPackages\" ADD COLUMN IF NOT EXISTS \"LastApprovalComment\" character varying(2000);");
                migrationBuilder.Sql("ALTER TABLE \"AiToolPackages\" ADD COLUMN IF NOT EXISTS \"ApprovedBy\" character varying(120);");
                migrationBuilder.Sql("ALTER TABLE \"AiToolPackages\" ADD COLUMN IF NOT EXISTS \"ApprovedAtUtc\" timestamp with time zone;");
                migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_AiToolPackages_CorrelationId\" ON \"AiToolPackages\" (\"CorrelationId\");");
                migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_AiToolPackages_TenantId\" ON \"AiToolPackages\" (\"TenantId\");");
                return;
            }

            migrationBuilder.AddColumn<string>(
                name: "ApprovalStatus",
                table: "AiToolPackages",
                type: "TEXT",
                maxLength: 24,
                nullable: false,
                defaultValue: "Draft");

            migrationBuilder.AddColumn<string>(
                name: "LastApprovalComment",
                table: "AiToolPackages",
                type: "TEXT",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                table: "AiToolPackages",
                type: "TEXT",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAtUtc",
                table: "AiToolPackages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(name: "IX_AiToolPackages_CorrelationId", table: "AiToolPackages", column: "CorrelationId");
            migrationBuilder.CreateIndex(name: "IX_AiToolPackages_TenantId", table: "AiToolPackages", column: "TenantId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_AiToolPackages_CorrelationId\";");
                migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_AiToolPackages_TenantId\";");
                migrationBuilder.Sql("ALTER TABLE \"AiToolPackages\" DROP COLUMN IF EXISTS \"ApprovalStatus\";");
                migrationBuilder.Sql("ALTER TABLE \"AiToolPackages\" DROP COLUMN IF EXISTS \"LastApprovalComment\";");
                migrationBuilder.Sql("ALTER TABLE \"AiToolPackages\" DROP COLUMN IF EXISTS \"ApprovedBy\";");
                migrationBuilder.Sql("ALTER TABLE \"AiToolPackages\" DROP COLUMN IF EXISTS \"ApprovedAtUtc\";");
                return;
            }

            migrationBuilder.DropIndex(name: "IX_AiToolPackages_CorrelationId", table: "AiToolPackages");
            migrationBuilder.DropIndex(name: "IX_AiToolPackages_TenantId", table: "AiToolPackages");
            migrationBuilder.DropColumn(name: "ApprovalStatus", table: "AiToolPackages");
            migrationBuilder.DropColumn(name: "LastApprovalComment", table: "AiToolPackages");
            migrationBuilder.DropColumn(name: "ApprovedBy", table: "AiToolPackages");
            migrationBuilder.DropColumn(name: "ApprovedAtUtc", table: "AiToolPackages");
        }
    }
}
