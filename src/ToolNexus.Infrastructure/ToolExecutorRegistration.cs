using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Abstractions;
using ToolNexus.Infrastructure.Executors;

namespace ToolNexus.Infrastructure;

public static class ToolExecutorRegistration
{
    public static IServiceCollection AddToolExecutors(this IServiceCollection services)
    {
        // Explicit module registration to avoid broad reflection-based scanning.
        // Executors are stateless and reused by singleton startup validators.
        services.AddSingleton<IToolExecutor, Base64ToolExecutor>();
        services.AddSingleton<IToolExecutor, CsvToolExecutor>();
        services.AddSingleton<IToolExecutor, HtmlToolExecutor>();
        services.AddSingleton<IToolExecutor, JsonToolExecutor>();
        services.AddSingleton<IToolExecutor, JsonValidatorToolExecutor>();
        services.AddSingleton<IToolExecutor, JsonToolkitProToolExecutor>();
        services.AddSingleton<IToolExecutor, MinifierToolExecutor>();
        services.AddSingleton<IToolExecutor, XmlToolExecutor>();
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("json-to-xml"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("xml-to-json"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("csv-to-json"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("json-to-csv"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("base64-decode"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("url-encode"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("url-decode"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("markdown-to-html"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("html-to-markdown"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("js-minifier"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("sql-formatter"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("regex-tester"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("text-diff"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("uuid-generator"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("case-converter"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("html-entities"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("yaml-to-json"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("json-to-yaml"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("file-merge"));
        services.AddSingleton<IToolExecutor>(_ => new ManifestMappedToolExecutor("text-intelligence-analyzer"));

        return services;
    }
}
