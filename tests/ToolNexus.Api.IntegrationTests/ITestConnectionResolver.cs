namespace ToolNexus.Api.IntegrationTests;

public interface ITestConnectionResolver
{
    TestConnectionResolution Resolve();
}

public sealed record TestConnectionResolution(bool IsValid, string? Provider, string? ConnectionString, string? SourcePath)
{
    public static TestConnectionResolution Invalid(string? sourcePath = null) => new(false, null, null, sourcePath);
}
