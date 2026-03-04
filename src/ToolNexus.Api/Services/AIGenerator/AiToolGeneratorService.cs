namespace ToolNexus.Api.Services.AIGenerator;

public sealed class AiToolGeneratorService(
    ToolSchemaGenerator schemaGenerator,
    ToolManifestGenerator manifestGenerator)
{
    public AiToolGenerationResult Generate(string prompt)
    {
        var capability = schemaGenerator.DeriveCapability(prompt);
        var slug = schemaGenerator.ToSlug(capability);

        return new AiToolGenerationResult(
            Schema: schemaGenerator.Generate(prompt),
            Manifest: manifestGenerator.Generate(slug),
            SeoTitle: BuildSeoTitle(capability),
            SeoDescription: BuildSeoDescription(capability));
    }

    private static string BuildSeoTitle(string capability)
        => $"{ToTitleCase(capability)} Tool | Free Schema Tool";

    private static string BuildSeoDescription(string capability)
        => $"Use this schema-only tool to {capability.ToLowerInvariant()}. Fast, browser-based, and easy to use.";

    private static string ToTitleCase(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return "Generated";
        }

        return string.Join(' ', text
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(word => char.ToUpperInvariant(word[0]) + word[1..].ToLowerInvariant()));
    }
}

public sealed record AiToolGenerationResult(
    string Schema,
    string Manifest,
    string SeoTitle,
    string SeoDescription);
