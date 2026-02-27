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

            AlterTimestampColumnIfTableExists(migrationBuilder, "DailyToolMetrics", "DateUtc", "timestamptz");
            AlterTimestampColumnIfTableExists(migrationBuilder, "ToolAnomalySnapshots", "DateUtc", "timestamptz");
            AlterTimestampColumnIfTableExists(migrationBuilder, "ToolExecutionEvents", "TimestampUtc", "timestamptz");
            AlterTimestampColumnIfTableExists(migrationBuilder, "ToolDefinitions", "UpdatedAt", "timestamptz");
            AlterTimestampColumnIfTableExists(migrationBuilder, "RuntimeIncidents", "FirstOccurredUtc", "timestamptz");
            AlterTimestampColumnIfTableExists(migrationBuilder, "RuntimeIncidents", "LastOccurredUtc", "timestamptz");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (!ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            AlterTimestampColumnIfTableExists(migrationBuilder, "DailyToolMetrics", "DateUtc", "text");
            AlterTimestampColumnIfTableExists(migrationBuilder, "ToolAnomalySnapshots", "DateUtc", "text");
            AlterTimestampColumnIfTableExists(migrationBuilder, "ToolExecutionEvents", "TimestampUtc", "text");
            AlterTimestampColumnIfTableExists(migrationBuilder, "ToolDefinitions", "UpdatedAt", "text");
            AlterTimestampColumnIfTableExists(migrationBuilder, "RuntimeIncidents", "FirstOccurredUtc", "text");
            AlterTimestampColumnIfTableExists(migrationBuilder, "RuntimeIncidents", "LastOccurredUtc", "text");
        }

        private static void AlterTimestampColumnIfTableExists(MigrationBuilder migrationBuilder, string tableName, string columnName, string targetType)
        {
            var castType = targetType == "text" ? "text" : "timestamptz";
            migrationBuilder.Sql($"""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '{tableName}')
                    THEN
                        EXECUTE 'ALTER TABLE "{tableName}" ALTER COLUMN "{columnName}" TYPE {targetType} USING "{columnName}"::{castType};';
                    END IF;
                END
                $$;
                """);
        }
    }
}
