using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddAiToolPackagesImportDomain : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                migrationBuilder.Sql(
                    """
                    CREATE TABLE IF NOT EXISTS "AiToolPackages" (
                        "Id" uuid NOT NULL,
                        "Slug" character varying(120) NOT NULL,
                        "Status" character varying(24) NOT NULL,
                        "JsonPayload" jsonb NOT NULL,
                        "CreatedUtc" timestamp with time zone NOT NULL,
                        "UpdatedUtc" timestamp with time zone NOT NULL,
                        "Version" integer NOT NULL DEFAULT 1,
                        "CorrelationId" character varying(120) NOT NULL,
                        "TenantId" character varying(120) NOT NULL,
                        CONSTRAINT "PK_AiToolPackages" PRIMARY KEY ("Id")
                    );
                    """);

                migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_AiToolPackages_Slug\" ON \"AiToolPackages\" (\"Slug\");");
                migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_AiToolPackages_CreatedUtc\" ON \"AiToolPackages\" (\"CreatedUtc\");");
                migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_AiToolPackages_CorrelationId_CreatedUtc\" ON \"AiToolPackages\" (\"CorrelationId\", \"CreatedUtc\");");
                migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_AiToolPackages_TenantId_CreatedUtc\" ON \"AiToolPackages\" (\"TenantId\", \"CreatedUtc\");");
                return;
            }

            migrationBuilder.CreateTable(
                name: "AiToolPackages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 24, nullable: false),
                    JsonPayload = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    CorrelationId = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    TenantId = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiToolPackages", x => x.Id);
                });

            migrationBuilder.CreateIndex(name: "IX_AiToolPackages_Slug", table: "AiToolPackages", column: "Slug", unique: true);
            migrationBuilder.CreateIndex(name: "IX_AiToolPackages_CreatedUtc", table: "AiToolPackages", column: "CreatedUtc");
            migrationBuilder.CreateIndex(name: "IX_AiToolPackages_CorrelationId_CreatedUtc", table: "AiToolPackages", columns: new[] { "CorrelationId", "CreatedUtc" });
            migrationBuilder.CreateIndex(name: "IX_AiToolPackages_TenantId_CreatedUtc", table: "AiToolPackages", columns: new[] { "TenantId", "CreatedUtc" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS \"AiToolPackages\";");
        }
    }
}
