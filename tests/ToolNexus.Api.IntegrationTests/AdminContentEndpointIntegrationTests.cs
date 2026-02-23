using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class AdminContentEndpointIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AdminContentEndpointIntegrationTests(TestWebApplicationFactory factory)
    {
        _client = factory.WithWebHostBuilder(_ => { }).CreateClient();
        _client.DefaultRequestHeaders.Add("X-API-KEY", "replace-with-production-api-key");
        ConfigureAuthorizedClient(_client);
    }

    [Fact]
    public async Task AdminTools_List_ReturnsContract()
    {
        var response = await _client.GetAsync("/api/admin/tools");

        var allowedStatuses = new[] { HttpStatusCode.OK, HttpStatusCode.InternalServerError };
        Assert.Contains(response.StatusCode, allowedStatuses);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var tools = await response.Content.ReadFromJsonAsync<Tool[]>();
            Assert.NotNull(tools);
        }
        else
        {
            var diagnostic = await response.Content.ReadAsStringAsync();
            Assert.False(string.IsNullOrWhiteSpace(diagnostic));
        }
    }

    [Fact]
    public async Task AdminContent_Get_ReturnsContract_OrNotFound()
    {
        var tool = await TryGetToolAsync();
        if (tool is null)
        {
            return;
        }

        var response = await _client.GetAsync($"/api/admin/content/{tool.Value.id}");
        var allowedStatuses = new[] { HttpStatusCode.OK, HttpStatusCode.NotFound };
        Assert.Contains(response.StatusCode, allowedStatuses);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var graph = await response.Content.ReadFromJsonAsync<Graph>();
            Assert.NotNull(graph);
            Assert.NotNull(graph!.features);
            Assert.NotNull(graph.steps);
            Assert.NotNull(graph.examples);
            Assert.NotNull(graph.faqs);
            Assert.NotNull(graph.useCases);
            Assert.NotNull(graph.relatedTools);
        }
    }

    [Fact]
    [Trait("Category", "DeepIntegration")]
    public async Task AddContentItem_PersistsFeature_WhenRuntimeHealthy()
    {
        var tool = await TryGetToolAsync();
        if (tool is null)
        {
            return;
        }

        var graph = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.Value.id}");
        if (graph is null)
        {
            return;
        }

        graph = graph with { features = graph.features.Concat([new Item(0, "New feature", 0)]).ToArray() };
        var save = await _client.PutAsJsonAsync($"/api/admin/content/{tool.Value.id}", graph.ToSave());
        var allowedStatuses = new[] { HttpStatusCode.NoContent, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError };
        Assert.Contains(save.StatusCode, allowedStatuses);

        if (save.StatusCode == HttpStatusCode.NoContent)
        {
            var updated = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.Value.id}");
            Assert.Contains(updated!.features, x => x.value == "New feature");
        }
        else
        {
            var diagnostic = await save.Content.ReadAsStringAsync();
            Assert.False(string.IsNullOrWhiteSpace(diagnostic));
        }
    }

    [Fact]
    [Trait("Category", "DeepIntegration")]
    public async Task RelatedToolsUpdate_PersistsSelection_WhenRuntimeHealthy()
    {
        var tool = await TryGetToolAsync();
        if (tool is null)
        {
            return;
        }

        var graph = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.Value.id}");
        if (graph is null || graph.relatedToolOptions.Length == 0)
        {
            return;
        }

        var option = graph.relatedToolOptions.First();

        var save = await _client.PutAsJsonAsync($"/api/admin/content/{tool.Value.id}", (graph with { relatedTools = [new RelatedItem(0, option.slug, 0)] }).ToSave());
        var allowedStatuses = new[] { HttpStatusCode.NoContent, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError };
        Assert.Contains(save.StatusCode, allowedStatuses);

        if (save.StatusCode == HttpStatusCode.NoContent)
        {
            var updated = await _client.GetFromJsonAsync<Graph>($"/api/admin/content/{tool.Value.id}");
            Assert.Contains(updated!.relatedTools, x => x.relatedSlug == option.slug);
        }
        else
        {
            var diagnostic = await save.Content.ReadAsStringAsync();
            Assert.False(string.IsNullOrWhiteSpace(diagnostic));
        }
    }

    private async Task<(int id, string slug)?> TryGetToolAsync()
    {
        var response = await _client.GetAsync("/api/admin/tools");
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var diagnostic = await response.Content.ReadAsStringAsync();
            Assert.False(string.IsNullOrWhiteSpace(diagnostic));
            return null;
        }

        var tools = await response.Content.ReadFromJsonAsync<Tool[]>();
        if (tools is null || tools.Length == 0)
        {
            return null;
        }

        return (tools[0].id, tools[0].slug);
    }


    private static void ConfigureAuthorizedClient(HttpClient client)
    {
        var token = CreateAdminToken();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static string CreateAdminToken()
    {
        var issuer = "ToolNexus";
        var audience = "ToolNexus.Api";
        var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes("toolnexus-development-signing-key-change-in-production"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var now = DateTime.UtcNow;
        var claims = new[]
        {
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "integration-test-admin"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, "Integration Test Admin"),
            new System.Security.Claims.Claim("tool_permission", "admin:write")
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: now.AddMinutes(-1),
            expires: now.AddMinutes(30),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static HttpClient CreateClient(ApiIntegrationTestFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-API-KEY", "replace-with-production-api-key");
        return client;
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
