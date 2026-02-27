namespace ToolNexus.Infrastructure.Options;

public sealed class DatabaseInitializationOptions
{
    public const string SectionName = "Database";

    public string Provider { get; set; } = "PostgreSQL";

    public string ConnectionString { get; set; } = string.Empty;

    public bool EnableDevelopmentFallbackConnection { get; set; }

    public string? DevelopmentFallbackConnectionString { get; set; }

    public bool RunMigrationOnStartup { get; set; } = true;

    public bool RunSeedOnStartup { get; set; } = true;
}
