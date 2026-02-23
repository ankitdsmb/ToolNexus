namespace ToolNexus.Infrastructure.Options;

public sealed class DatabaseInitializationOptions
{
    public const string SectionName = "Database";

    public bool RunMigrationOnStartup { get; set; } = true;

    public bool RunSeedOnStartup { get; set; } = false;
}
