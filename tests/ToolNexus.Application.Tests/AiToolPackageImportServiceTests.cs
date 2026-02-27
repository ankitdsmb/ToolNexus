using Xunit;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Application.Tests;

public sealed class AiToolPackageImportServiceTests
{
    [Fact]
    public async Task GenerateContractAsync_DuplicateSlug_ReturnsDuplicateStatus()
    {
        var repository = new InMemoryAiToolPackageRepository();
        await repository.CreateAsync(
            new AiToolPackageContract("v1", "json-formatter", "{}", "{}", "{}", "{}", [new AiToolVirtualFile("tool.js", "js", "export default {}")], "{}"),
            "corr",
            "tenant",
            CancellationToken.None);
        var service = CreateService(repository);

        var response = await service.GenerateContractAsync(
            new AiToolContractGenerationRequest("Json Formatter", ["other-tool"], "corr", "tenant"),
            CancellationToken.None);

        Assert.Equal("duplicate", response.Status);
        Assert.Equal("Tool already exists", response.Message);
        Assert.Equal("json-formatter", response.Slug);
        Assert.Null(response.ContractJson);
    }

    [Fact]
    public async Task GenerateContractAsync_UniqueSlug_ReturnsContractPayload()
    {
        var service = CreateService();

        var response = await service.GenerateContractAsync(
            new AiToolContractGenerationRequest("CSV Cleaner", ["json-formatter"], "corr", "tenant"),
            CancellationToken.None);

        Assert.Equal("ok", response.Status);
        Assert.Equal("csv-cleaner", response.Slug);
        Assert.NotNull(response.ContractJson);
        Assert.Contains("\"contractVersion\": \"v1\"", response.ContractJson, StringComparison.Ordinal);
        Assert.Contains("\"executionAuthority\": \"ShadowOnly\"", response.ContractJson, StringComparison.Ordinal);
        Assert.Contains("\"template.html\"", response.ContractJson, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ValidateAsync_RejectsBannedJavascriptPattern()
    {
        var service = CreateService();
        var payload = """
        {
          "contractVersion":"v1",
          "tool":{"slug":"unsafe-tool"},
          "runtime":{},
          "ui":{},
          "seo":{},
          "files":[{"path":"tool.js","type":"js","content":"eval('bad')"}]
        }
        """;

        var result = await service.ValidateAsync(payload, CancellationToken.None);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.Contains("banned JavaScript", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task CreateDraftAsync_ValidPayload_PersistsDraft()
    {
        var repository = new InMemoryAiToolPackageRepository();
        var service = CreateService(repository);
        var payload = """
        {
          "contractVersion":"v1",
          "tool":{"slug":"draft-tool"},
          "runtime":{},
          "ui":{},
          "seo":{},
          "files":[{"path":"tool.js","type":"js","content":"export default { mount(){ return { destroy(){} }; } };"}]
        }
        """;

        var record = await service.CreateDraftAsync(new AiToolPackageImportRequest(payload, "corr-1", "tenant-a"), CancellationToken.None);

        Assert.Equal("draft-tool", record.Slug);
        Assert.Equal(AiToolPackageStatus.Draft, record.Status);
    }

    private static AiToolPackageImportService CreateService(IAiToolPackageRepository? repository = null)
        => new(repository ?? new InMemoryAiToolPackageRepository(), new StubToolDefinitionService());

    private sealed class StubToolDefinitionService : IToolDefinitionService
    {
        public Task<ToolDefinitionDetail> CreateAsync(CreateToolDefinitionRequest request, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ToolDefinitionDetail?> GetByIdAsync(int id, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<IReadOnlyCollection<ToolDefinitionListItem>> GetListAsync(CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyCollection<ToolDefinitionListItem>>([]);
        public Task<bool> SetEnabledAsync(int id, bool enabled, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ToolDefinitionDetail?> UpdateAsync(int id, UpdateToolDefinitionRequest request, CancellationToken cancellationToken = default) => throw new NotImplementedException();
    }

    private sealed class InMemoryAiToolPackageRepository : IAiToolPackageRepository
    {
        private readonly Dictionary<string, AiToolPackageRecord> records = new(StringComparer.OrdinalIgnoreCase);

        public Task<bool> ExistsBySlugAsync(string slug, CancellationToken cancellationToken)
            => Task.FromResult(records.ContainsKey(slug));

        public Task<AiToolPackageRecord> CreateAsync(AiToolPackageContract contract, string correlationId, string tenantId, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            var record = new AiToolPackageRecord(Guid.NewGuid(), contract.Slug, AiToolPackageStatus.Draft, contract.RawJsonPayload, now, now, 1);
            records[contract.Slug] = record;
            return Task.FromResult(record);
        }

        public Task<AiToolPackageRecord?> GetBySlugAsync(string slug, CancellationToken cancellationToken)
            => Task.FromResult(records.TryGetValue(slug, out var record) ? record : null);
    }
}
