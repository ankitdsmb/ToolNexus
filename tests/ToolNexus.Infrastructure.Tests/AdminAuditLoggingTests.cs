using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class AdminAuditLoggingTests
{
    [Fact]
    public async Task ToolMutation_CreatesAuditRecord()
    {
        await using var database = await TestDatabaseInstance.CreateAsync(TestDatabaseProvider.Sqlite);
        await using var context = database.CreateContext();

        var auditLogger = new AdminAuditLogger(context, new HttpContextAccessor(), new AuditPayloadProcessor(), Microsoft.Extensions.Options.Options.Create(new ToolNexus.Infrastructure.Options.AuditGuardrailsOptions { WriteEnabled = true, WorkerEnabled = false }), new AuditGuardrailsMetrics(), NullLogger<AdminAuditLogger>.Instance);
        var repository = new EfToolDefinitionRepository(context, auditLogger);

        var created = await repository.CreateAsync(new CreateToolDefinitionRequest(
            "Json",
            "json",
            "desc",
            "Format",
            "Enabled",
            "icon",
            1,
            "{}",
            "{}"));

        var audit = context.AuditEvents.OrderByDescending(x => x.CreatedAtUtc).FirstOrDefault();
        Assert.NotNull(audit);
        Assert.Equal("admin.tooldefinition.toolcreated", audit!.Action);
        Assert.Equal(created.Id.ToString(), audit.TargetId);
    }
}
