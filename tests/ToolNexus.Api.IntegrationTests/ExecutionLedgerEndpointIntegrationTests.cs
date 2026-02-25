using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class ExecutionLedgerEndpointIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public ExecutionLedgerEndpointIntegrationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Add("X-API-KEY", "replace-with-production-api-key");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateAdminToken());
    }

    [Fact]
    public async Task GetExecutions_ReturnsContract()
    {
        var id = await SeedExecutionAsync();

        var response = await _client.GetAsync("/api/admin/executions?page=1&pageSize=10&correlationId=corr-api");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ExecutionLedgerPageContract>();
        Assert.NotNull(payload);
        Assert.Contains(payload!.Items, x => x.Id == id);
    }

    [Fact]
    public async Task GetExecutionAndSnapshot_ById_ReturnContracts()
    {
        var id = await SeedExecutionAsync();

        var detail = await _client.GetAsync($"/api/admin/executions/{id}");
        var snapshot = await _client.GetAsync($"/api/admin/executions/{id}/snapshot");

        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
        Assert.Equal(HttpStatusCode.OK, snapshot.StatusCode);
    }

    private async Task<Guid> SeedExecutionAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();

        var runId = Guid.NewGuid();
        db.ExecutionRuns.Add(new ExecutionRunEntity
        {
            Id = runId,
            ToolId = "json-formatter",
            ExecutedAtUtc = DateTime.UtcNow,
            Success = true,
            DurationMs = 7,
            PayloadSize = 100,
            ExecutionMode = "Local",
            RuntimeLanguage = "dotnet",
            AdapterName = "Legacy",
            AdapterResolutionStatus = "legacy",
            Capability = "format",
            Authority = "LegacyAuthoritative",
            CorrelationId = "corr-api",
            TenantId = "tenant-api",
            TraceId = "trace-api",
            Snapshot = new ExecutionSnapshotEntity { Id = Guid.NewGuid(), SnapshotId = $"snap-{runId:N}", Authority = "LegacyAuthoritative", RuntimeLanguage = "dotnet", ExecutionCapability = "format", TimestampUtc = DateTime.UtcNow, ConformanceVersion = "v1" },
            Conformance = new ExecutionConformanceResultEntity { Id = Guid.NewGuid(), IsValid = true, NormalizedStatus = "ok", WasNormalized = false, IssueCount = 0, IssuesJson = "[]" },
            AuthorityDecision = new ExecutionAuthorityDecisionEntity { Id = Guid.NewGuid(), Authority = "LegacyAuthoritative", AdmissionAllowed = true, AdmissionReason = "Allowed", DecisionSource = "policy" }
        });

        await db.SaveChangesAsync();
        return runId;
    }

    private static string CreateAdminToken()
    {
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("toolnexus-development-signing-key-change-in-production"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[] { new Claim("tool_permission", "admin:read") };

        var token = new JwtSecurityToken(
            issuer: "ToolNexus",
            audience: "ToolNexus.Api",
            claims: claims,
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: credentials);

        return handler.WriteToken(token);
    }

    private sealed record ExecutionLedgerPageContract(int Page, int PageSize, int TotalItems, IReadOnlyList<ExecutionLedgerItemContract> Items);
    private sealed record ExecutionLedgerItemContract(Guid Id, string ToolId);
}
