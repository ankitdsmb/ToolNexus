using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddChangelogEntries : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "changelog_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    version = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    tag = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    release_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_changelog_entries", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_changelog_entries_release_date",
                table: "changelog_entries",
                column: "release_date");

            migrationBuilder.CreateIndex(
                name: "IX_changelog_entries_tag",
                table: "changelog_entries",
                column: "tag");

            migrationBuilder.CreateIndex(
                name: "IX_changelog_entries_version",
                table: "changelog_entries",
                column: "version");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "changelog_entries");
        }
    }
}
