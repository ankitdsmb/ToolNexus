using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class TestDatabaseProviderMatrixTests
{
    [Theory]
    [InlineData(null, true)]
    [InlineData("all", true)]
    [InlineData("sqlite", true)]
    [InlineData("postgres", false)]
    public void ShouldIncludeSqlite_FollowsProviderSelection(string? selection, bool expected)
    {
        var include = TestDatabaseProviderMatrix.ShouldIncludeSqlite(selection);

        Assert.Equal(expected, include);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("all", true)]
    [InlineData("postgres", true)]
    [InlineData("postgresql", true)]
    [InlineData("sqlite", false)]
    public void ShouldIncludePostgres_FollowsProviderSelection(string? selection, bool expected)
    {
        var include = TestDatabaseProviderMatrix.ShouldIncludePostgres(selection);

        Assert.Equal(expected, include);
    }
}
