using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class TestConnectionResolverTests
{
    [Fact]
    public void Resolve_WhenTestConnectionJsonExists_UsesProvidedPostgresConnection()
    {
        var repositoryRoot = CreateRepositoryRoot();
        var expectedConnection = "postgresql://postgres:postgres@localhost:5432/toolnexus";
        File.WriteAllText(Path.Combine(repositoryRoot, "testcs.txt"), $$"""
{
  "Database": {
    "Provider": "Postgres",
    "ConnectionString": "{{expectedConnection}}"
  }
}
""");

        var resolver = new TestConnectionResolver(repositoryRoot);

        var resolution = resolver.Resolve();

        Assert.True(resolution.IsValid);
        Assert.Equal("PostgreSQL", resolution.Provider);
        Assert.Equal(expectedConnection, resolution.ConnectionString);
    }

    [Fact]
    public void BuildSettings_WhenTestConnectionFileIsMissing_Throws()
    {
        var repositoryRoot = CreateRepositoryRoot();
        var resolver = new TestConnectionResolver(repositoryRoot);

        var resolution = resolver.Resolve();

        var exception = Assert.Throws<InvalidOperationException>(() => TestWebApplicationFactory.BuildSettings(resolution));
        Assert.Contains("valid PostgreSQL test connection", exception.Message);
    }

    [Fact]
    public void BuildSettings_WhenConnectionStringIsInvalid_Throws()
    {
        var repositoryRoot = CreateRepositoryRoot();
        File.WriteAllText(Path.Combine(repositoryRoot, "testcs.txt"), "Data Source=safe-fallback.db");
        var resolver = new TestConnectionResolver(repositoryRoot);

        var resolution = resolver.Resolve();

        var exception = Assert.Throws<InvalidOperationException>(() => TestWebApplicationFactory.BuildSettings(resolution));
        Assert.Contains("valid PostgreSQL test connection", exception.Message);
    }

    private static string CreateRepositoryRoot()
    {
        var root = Path.Combine(Path.GetTempPath(), $"toolnexus.test-root.{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);
        return root;
    }
}
