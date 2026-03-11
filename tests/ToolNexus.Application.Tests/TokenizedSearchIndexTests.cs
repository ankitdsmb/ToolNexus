using Xunit;
using ToolNexus.Application.Contracts;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Discovery;

namespace ToolNexus.Application.Tests;

public sealed class TokenizedSearchIndexTests
{
    [Fact]
    public async Task SearchAsync_RanksByWeightedFields()
    {
        var repo = new StubRepository(
        [
            CreateDoc("json-viewer", "JSON Explorer", "json parse view", "render inspect", "Utility"),
            CreateDoc("xml-viewer", "XML Explorer", "xml parse view", "json conversion", "Utility"),
            CreateDoc("yaml-viewer", "YAML Browser", "yaml parse view", "formats", "Utility")
        ]);

        var sut = new TokenizedSearchIndex(repo);

        var result = await sut.SearchAsync("json", 1, 20);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal("json-viewer", result.Items.First().Slug);
    }

    [Fact]
    public async Task SearchAsync_AppliesPagination()
    {
        var repo = new StubRepository(
        [
            CreateDoc("json-a", "JSON Alpha", "json", "json", "Utility"),
            CreateDoc("json-b", "JSON Beta", "json", "json", "Utility"),
            CreateDoc("json-c", "JSON Gamma", "json", "json", "Utility")
        ]);

        var sut = new TokenizedSearchIndex(repo);

        var pageOne = await sut.SearchAsync("json", 1, 2);
        var pageTwo = await sut.SearchAsync("json", 2, 2);

        Assert.Equal(3, pageOne.TotalCount);
        Assert.Equal(2, pageOne.Items.Count);
        Assert.Single(pageTwo.Items);
        Assert.Equal(2, pageTwo.Page);
    }

    private static ToolSearchDocument CreateDoc(string slug, string title, string description, string keywords, string category)
    {
        var item = new ToolCatalogItemDto(
            slug,
            title,
            category,
            ["run"],
            title,
            description,
            "{}",
            ["run"],
            "1.0.0",
            true,
            false,
            true,
            "Medium",
            false,
            false,
            "dotnet",
            "standard",
            null);

        return new ToolSearchDocument(slug, title, category, description, keywords, item);
    }

    private sealed class StubRepository(IReadOnlyCollection<ToolSearchDocument> docs) : IToolSearchDocumentRepository
    {
        public Task<int> CountAsync(IReadOnlyCollection<string> tokens, CancellationToken cancellationToken = default)
            => Task.FromResult(Filter(tokens).Count());

        public Task<IReadOnlyCollection<ToolSearchDocument>> FetchPageAsync(IReadOnlyCollection<string> tokens, int skip, int take, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyCollection<ToolSearchDocument>>(Filter(tokens).Skip(skip).Take(take).ToArray());

        private IEnumerable<ToolSearchDocument> Filter(IReadOnlyCollection<string> tokens)
        {
            if (tokens.Count == 0)
            {
                return docs;
            }

            return docs.Where(doc => tokens.All(token =>
                doc.Title.Contains(token, StringComparison.OrdinalIgnoreCase)
                || doc.Description.Contains(token, StringComparison.OrdinalIgnoreCase)
                || doc.Keywords.Contains(token, StringComparison.OrdinalIgnoreCase)));
        }
    }
}
