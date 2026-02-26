using System.Reflection;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Xunit;

namespace ToolNexus.Infrastructure.Tests.Migrations;

public sealed class MigrationSafetyExtensionsTests
{
    [Fact]
    public void SafeRenameColumnIfExists_UsesGuardedSqlForPostgres()
    {
        var migrationBuilder = new MigrationBuilder("Npgsql.EntityFrameworkCore.PostgreSQL");

        InvokeExtension(
            "SafeRenameColumnIfExists",
            migrationBuilder,
            "Destination",
            "audit_outbox",
            "destination");

        var operation = Assert.Single(migrationBuilder.Operations.OfType<SqlOperation>());
        Assert.Contains("information_schema.columns", operation.Sql, StringComparison.Ordinal);
        Assert.Contains("column_name = 'Destination'", operation.Sql, StringComparison.Ordinal);
        Assert.Contains("column_name = 'destination'", operation.Sql, StringComparison.Ordinal);
        Assert.Contains("ALTER TABLE \"audit_outbox\" RENAME COLUMN \"Destination\" TO \"destination\"", operation.Sql, StringComparison.Ordinal);
    }

    [Fact]
    public void SafeRenameIndexIfExists_UsesGuardedSqlForPostgres()
    {
        var migrationBuilder = new MigrationBuilder("Npgsql.EntityFrameworkCore.PostgreSQL");

        InvokeExtension(
            "SafeRenameIndexIfExists",
            migrationBuilder,
            "IX_audit_outbox_AuditEventId",
            "audit_outbox",
            "IX_audit_outbox_audit_event_id");

        var operation = Assert.Single(migrationBuilder.Operations.OfType<SqlOperation>());
        Assert.Contains("to_regclass('IX_audit_outbox_AuditEventId') IS NOT NULL", operation.Sql, StringComparison.Ordinal);
        Assert.Contains("to_regclass('IX_audit_outbox_audit_event_id') IS NULL", operation.Sql, StringComparison.Ordinal);
        Assert.Contains("ALTER INDEX \"IX_audit_outbox_AuditEventId\" RENAME TO \"IX_audit_outbox_audit_event_id\"", operation.Sql, StringComparison.Ordinal);
    }

    private static void InvokeExtension(string methodName, MigrationBuilder builder, string name, string table, string newName)
    {
        var type = Type.GetType("ToolNexus.Infrastructure.Data.Migrations.MigrationSafetyExtensions, ToolNexus.Infrastructure", throwOnError: true)!;
        var method = type.GetMethod(methodName, BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic)!;
        _ = method.Invoke(null, [builder, name, table, newName]);
    }
}
