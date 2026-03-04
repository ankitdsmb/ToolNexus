namespace ToolNexus.Web.Services;

public sealed class CssArtifactStorageService(IWebHostEnvironment environment)
{
    private readonly string _artifactRoot = Path.Combine(environment.ContentRootPath, "artifacts", "css-scans");

    public async Task<string> SaveOptimizedCssAsync(Guid jobId, string css, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(_artifactRoot);
        var fileName = $"optimized-{jobId:N}.css";
        var filePath = Path.Combine(_artifactRoot, fileName);
        await File.WriteAllTextAsync(filePath, css ?? string.Empty, cancellationToken);
        return filePath;
    }

    public string GetDownloadFileName(Guid jobId) => $"optimized-{jobId:N}.css";
}
