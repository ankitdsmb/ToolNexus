using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class TestConnectionResolverTests
{
    [Fact]
    public void Resolve_WhenTestConnectionFileExists_UsesProvidedConnection()
    {
        var repositoryRoot = CreateRepositoryRoot();
        var expectedConnection = "Host=localhost;Port=5432;Database=toolnexus;Username=test;Password=test";
        File.WriteAllText(Path.Combine(repositoryRoot, "testcs.txt"), expectedConnection);

        var resolver = new TestConnectionResolver(repositoryRoot);

        var resolution = resolver.Resolve();

        Assert.True(resolution.IsValid);
        Assert.Equal("Postgres", resolution.Provider);
        Assert.Equal(expectedConnection, resolution.ConnectionString);
    }

    [Fact]
    public void BuildSettings_WhenTestConnectionFileIsMissing_UsesSqliteFallback()
    {
        var repositoryRoot = CreateRepositoryRoot();
        var resolver = new TestConnectionResolver(repositoryRoot);

        var resolution = resolver.Resolve();
        var settings = TestWebApplicationFactory.BuildSettings(resolution, "Data Source=fallback.db");

        Assert.Equal("Sqlite", settings["Database:Provider"]);
        Assert.Equal("Data Source=fallback.db", settings["Database:ConnectionString"]);
    }

    [Fact]
    public void BuildSettings_WhenConnectionStringIsInvalid_UsesSafeSqliteFallback()
    {
        var repositoryRoot = CreateRepositoryRoot();
        File.WriteAllText(Path.Combine(repositoryRoot, "testcs.txt"), "Host");
        var resolver = new TestConnectionResolver(repositoryRoot);

        var resolution = resolver.Resolve();
        var settings = TestWebApplicationFactory.BuildSettings(resolution, "Data Source=safe-fallback.db");

        Assert.Equal("Sqlite", settings["Database:Provider"]);
        Assert.Equal("Data Source=safe-fallback.db", settings["Database:ConnectionString"]);
    }

    private static string CreateRepositoryRoot()
    {
        var root = Path.Combine(Path.GetTempPath(), $"toolnexus.test-root.{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);
        return root;
    }
}
