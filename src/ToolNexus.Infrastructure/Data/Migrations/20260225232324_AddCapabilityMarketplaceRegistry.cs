using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCapabilityMarketplaceRegistry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "capability_registry",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    capability_id = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    provider = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    version = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    tool_id = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    runtime_language = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    complexity_tier = table.Column<int>(type: "integer", nullable: false),
                    permissions_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    installation_state = table.Column<int>(type: "integer", nullable: false),
                    authority = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    snapshot_id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    policy_version_token = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    policy_execution_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    synced_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_capability_registry", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_capability_registry_synced_at_utc",
                table: "capability_registry",
                column: "synced_at_utc");

            migrationBuilder.CreateIndex(
                name: "idx_capability_registry_tool_id",
                table: "capability_registry",
                column: "tool_id");

            migrationBuilder.CreateIndex(
                name: "ux_capability_registry_capability_id",
                table: "capability_registry",
                column: "capability_id",
                unique: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "capability_registry");

        }
    }
}
