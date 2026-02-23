using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Content.Entities;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class EfRuntimeIncidentRepositoryTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task GetToolHealthAsync_AggregatesByToolSlug_WithSeverityWeighting(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateAsync(provider);
        await using (var seed = db.CreateContext())
        {
            seed.RuntimeIncidents.AddRange(
                new RuntimeIncidentEntity
                {
                    Fingerprint = "json-formatter::execute::runtime_error::crash::object",
                    ToolSlug = "json-formatter",
                    Phase = "execute",
                    ErrorType = "runtime_error",
                    Message = "crash",
                    PayloadType = "object",
                    Severity = "critical",
                    Count = 2,
                    FirstOccurredUtc = DateTime.UtcNow.AddMinutes(-45),
                    LastOccurredUtc = DateTime.UtcNow.AddMinutes(-3)
                },
                new RuntimeIncidentEntity
                {
                    Fingerprint = "json-formatter::execute::contract_violation::legacy mismatch::html_element",
                    ToolSlug = "json-formatter",
                    Phase = "execute",
                    ErrorType = "contract_violation",
                    Message = "legacy mismatch",
                    PayloadType = "html_element",
                    Severity = "warning",
                    Count = 3,
                    FirstOccurredUtc = DateTime.UtcNow.AddMinutes(-40),
                    LastOccurredUtc = DateTime.UtcNow.AddMinutes(-2)
                },
                new RuntimeIncidentEntity
                {
                    Fingerprint = "base64-encoder::execute::contract_violation::legacy mismatch::html_element",
                    ToolSlug = "base64-encoder",
                    Phase = "execute",
                    ErrorType = "contract_violation",
                    Message = "legacy mismatch",
                    PayloadType = "html_element",
                    Severity = "warning",
                    Count = 1,
                    FirstOccurredUtc = DateTime.UtcNow.AddMinutes(-20),
                    LastOccurredUtc = DateTime.UtcNow.AddMinutes(-1)
                });

            await seed.SaveChangesAsync();
        }

        await using var verify = db.CreateContext();
        var repository = new EfRuntimeIncidentRepository(verify);

        IReadOnlyList<RuntimeToolHealthSnapshot> result = await repository.GetToolHealthAsync(CancellationToken.None);

        Assert.Equal(2, result.Count);

        var jsonFormatter = Assert.Single(result.Where(x => x.Slug == "json-formatter"));
        Assert.Equal(5, jsonFormatter.IncidentCount);
        Assert.Equal(61, jsonFormatter.HealthScore);
        Assert.Equal("legacy mismatch", jsonFormatter.DominantError);
        Assert.NotNull(jsonFormatter.LastIncidentUtc);

        var base64 = Assert.Single(result.Where(x => x.Slug == "base64-encoder"));
        Assert.Equal(95, base64.HealthScore);
    }
}
