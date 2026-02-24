using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ToolNexusContentDbContext))]
    [Migration("20260311000000_FixPostgresTimestampColumns")]
    public partial class FixPostgresTimestampColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (!ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            migrationBuilder.Sql("ALTER TABLE \"DailyToolMetrics\" ALTER COLUMN \"DateUtc\" TYPE timestamp with time zone USING \"DateUtc\"::timestamptz;");
            migrationBuilder.Sql("ALTER TABLE \"ToolAnomalySnapshots\" ALTER COLUMN \"DateUtc\" TYPE timestamp with time zone USING \"DateUtc\"::timestamptz;");
            migrationBuilder.Sql("ALTER TABLE \"ToolExecutionEvents\" ALTER COLUMN \"TimestampUtc\" TYPE timestamp with time zone USING \"TimestampUtc\"::timestamptz;");
            migrationBuilder.Sql("ALTER TABLE \"ToolDefinitions\" ALTER COLUMN \"UpdatedAt\" TYPE timestamp with time zone USING \"UpdatedAt\"::timestamptz;");
            migrationBuilder.Sql("ALTER TABLE \"RuntimeIncidents\" ALTER COLUMN \"FirstOccurredUtc\" TYPE timestamp with time zone USING \"FirstOccurredUtc\"::timestamptz;");
            migrationBuilder.Sql("ALTER TABLE \"RuntimeIncidents\" ALTER COLUMN \"LastOccurredUtc\" TYPE timestamp with time zone USING \"LastOccurredUtc\"::timestamptz;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (!ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            migrationBuilder.Sql("ALTER TABLE \"DailyToolMetrics\" ALTER COLUMN \"DateUtc\" TYPE text USING \"DateUtc\"::text;");
            migrationBuilder.Sql("ALTER TABLE \"ToolAnomalySnapshots\" ALTER COLUMN \"DateUtc\" TYPE text USING \"DateUtc\"::text;");
            migrationBuilder.Sql("ALTER TABLE \"ToolExecutionEvents\" ALTER COLUMN \"TimestampUtc\" TYPE text USING \"TimestampUtc\"::text;");
            migrationBuilder.Sql("ALTER TABLE \"ToolDefinitions\" ALTER COLUMN \"UpdatedAt\" TYPE text USING \"UpdatedAt\"::text;");
            migrationBuilder.Sql("ALTER TABLE \"RuntimeIncidents\" ALTER COLUMN \"FirstOccurredUtc\" TYPE text USING \"FirstOccurredUtc\"::text;");
            migrationBuilder.Sql("ALTER TABLE \"RuntimeIncidents\" ALTER COLUMN \"LastOccurredUtc\" TYPE text USING \"LastOccurredUtc\"::text;");
        }
    }
}
