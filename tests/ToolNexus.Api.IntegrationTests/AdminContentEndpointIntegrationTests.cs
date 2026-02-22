using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class AdminContentEndpointIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public AdminContentEndpointIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(_ => { }).CreateClient();
        _client.DefaultRequestHeaders.Add("X-API-KEY", "replace-with-production-api-key");
    }

    [Fact]
    public async Task AddContentItem_PersistsFeature()
    {
        var tool = await GetToolAsync();
        var graph = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.id}");
        Assert.NotNull(graph);

        graph = graph! with { features = graph.features.Concat([new Item(0, "New feature", 0)]).ToArray() };
        var save = await _client.PutAsJsonAsync($"/api/admin/content/{tool.id}", graph.ToSave());
        Assert.Equal(HttpStatusCode.NoContent, save.StatusCode);

        var updated = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.id}");
        Assert.Contains(updated!.features, x => x.value == "New feature");
    }

    [Fact]
    public async Task UpdateContentOrdering_PersistsSortOrder()
    {
        var tool = await GetToolAsync();
        var graph = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.id}");
        Assert.NotNull(graph);
        if (graph!.features.Length < 2) return;

        var reversed = graph.features.Reverse().Select((x,i) => x with { sortOrder = i }).ToArray();
        var save = await _client.PutAsJsonAsync($"/api/admin/content/{tool.id}", (graph with { features = reversed }).ToSave());
        Assert.Equal(HttpStatusCode.NoContent, save.StatusCode);

        var updated = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.id}");
        Assert.Equal(reversed[0].value, updated!.features.First().value);
    }

    [Fact]
    public async Task DeleteContent_RemovesFaq()
    {
        var tool = await GetToolAsync();
        var graph = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.id}");
        Assert.NotNull(graph);

        var save = await _client.PutAsJsonAsync($"/api/admin/content/{tool.id}", (graph! with { faqs = Array.Empty<Faq>() }).ToSave());
        Assert.Equal(HttpStatusCode.NoContent, save.StatusCode);

        var updated = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.id}");
        Assert.Empty(updated!.faqs);
    }

    [Fact]
    public async Task RelatedToolsUpdate_PersistsSelection()
    {
        var tool = await GetToolAsync();
        var graph = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.id}");
        Assert.NotNull(graph);
        var option = graph!.relatedToolOptions.First();

        var save = await _client.PutAsJsonAsync($"/api/admin/content/{tool.id}", (graph with { relatedTools = new[] { new RelatedItem(0, option.slug, 0) } }).ToSave());
        Assert.Equal(HttpStatusCode.NoContent, save.StatusCode);

        var updated = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.id}");
        Assert.Contains(updated!.relatedTools, x => x.relatedSlug == option.slug);
    }

    [Fact]
    public async Task FullContentGraphLoad_ReturnsAllBlocks()
    {
        var tool = await GetToolAsync();
        var response = await _client.GetAsync($"/api/admin/content/{tool.id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var graph = await response.Content.ReadFromJsonAsync<Graph>();
        Assert.NotNull(graph);
        Assert.NotNull(graph!.features);
        Assert.NotNull(graph.steps);
        Assert.NotNull(graph.examples);
        Assert.NotNull(graph.faqs);
        Assert.NotNull(graph.useCases);
        Assert.NotNull(graph.relatedTools);
    }

    private async Task<(int id, string slug)> GetToolAsync()
    {
        var tools = await _client.GetFromJsonAsync<Tool[]>("/api/admin/tools");
        Assert.NotNull(tools);
        return (tools![0].id, tools[0].slug);
    }

    private sealed record Tool(int id, string slug);
    private sealed record Item(int id, string value, int sortOrder);
    private sealed record Step(int id, string title, string description, int sortOrder);
    private sealed record Example(int id, string title, string input, string output, int sortOrder);
    private sealed record Faq(int id, string question, string answer, int sortOrder);
    private sealed record RelatedItem(int id, string relatedSlug, int sortOrder);
    private sealed record Option(string slug, string name);
    private sealed record Graph(int toolId, string toolSlug, string toolName, Item[] features, Step[] steps, Example[] examples, Faq[] faqs, Item[] useCases, RelatedItem[] relatedTools, Option[] relatedToolOptions)
    {
        public object ToSave() => new { features, steps, examples, faqs, useCases, relatedTools };
    }
}
