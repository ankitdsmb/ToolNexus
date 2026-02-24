using Serilog;
using Serilog.Events;
using Serilog.Filters;

namespace ToolNexus.Api.Logging;

public static class FileLoggingBootstrapper
{
    private static int _fileLoggingWarningEmitted;

    public static void Configure(WebApplicationBuilder builder)
    {
        var options = new ToolNexusLoggingOptions();
        builder.Configuration.GetSection(ToolNexusLoggingOptions.SectionName).Bind(options);

        builder.Host.UseSerilog((context, cfg) =>
        {
            var minLevel = ParseLevel(options.MinimumLevel);

            cfg.MinimumLevel.Is(minLevel)
                .Enrich.FromLogContext()
                .WriteTo.Async(x => x.Console());

            if (!options.EnableFileLogging)
            {
                return;
            }

            if (!TryEnsureLogDirectories())
            {
                EmitFileLoggingWarningOnce();
                return;
            }

            ConfigureCategorySink(cfg, "logs/runtime/runtime-.log", LoggingCategories.RuntimeIncidentLogger, options.RetentionDays);
            ConfigureCategorySink(cfg, "logs/admin/admin-.log", LoggingCategories.AdminApiLogger, options.RetentionDays);
            ConfigureCategorySink(cfg, "logs/startup/startup-.log", LoggingCategories.StartupLifecycleLogger, options.RetentionDays);
            ConfigureCategorySink(cfg, "logs/api/api-.log", LoggingCategories.ToolExecutionLogger, options.RetentionDays);
            ConfigureCategorySink(cfg, "logs/api/tool-sync-.log", LoggingCategories.ToolSyncLogger, options.RetentionDays);

            cfg.WriteTo.Logger(lc => lc
                .MinimumLevel.Error()
                .WriteTo.Async(x => x.File(
                    path: "logs/errors/error-.log",
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: options.RetentionDays,
                    shared: true,
                    outputTemplate: "{Timestamp:O} [{Level:u3}] ({SourceContext}) {Message:lj}{NewLine}{Exception}")));

            cfg.WriteTo.Async(x => x.File(
                path: "logs/api/api-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: options.RetentionDays,
                shared: true,
                outputTemplate: "{Timestamp:O} [{Level:u3}] ({SourceContext}) {Message:lj}{NewLine}{Exception}"));
        });
    }

    private static void ConfigureCategorySink(LoggerConfiguration cfg, string path, string sourceContext, int retentionDays)
    {
        cfg.WriteTo.Logger(lc => lc
            .Filter.ByIncludingOnly(Matching.FromSource(sourceContext))
            .WriteTo.Async(x => x.File(
                path: path,
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: retentionDays,
                shared: true,
                outputTemplate: "{Timestamp:O} [{Level:u3}] ({SourceContext}) {Message:lj}{NewLine}{Exception}")));
    }

    private static bool TryEnsureLogDirectories()
    {
        try
        {
            Directory.CreateDirectory("logs");
            Directory.CreateDirectory("logs/runtime");
            Directory.CreateDirectory("logs/admin");
            Directory.CreateDirectory("logs/api");
            Directory.CreateDirectory("logs/startup");
            Directory.CreateDirectory("logs/errors");
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static void EmitFileLoggingWarningOnce()
    {
        if (Interlocked.Exchange(ref _fileLoggingWarningEmitted, 1) == 1)
        {
            return;
        }

        Console.Error.WriteLine("[WARN] ToolNexus file logging unavailable. Falling back to console logging.");
    }

    private static LogEventLevel ParseLevel(string configuredLevel)
        => Enum.TryParse<LogEventLevel>(configuredLevel, true, out var parsed)
            ? parsed
            : LogEventLevel.Information;
}
