using ToolNexus.ConsoleRunner.Scaffolding;

var command = ToolCommand.Parse(args);
if (command is null)
{
    ToolCommand.WriteUsage();
    return 1;
}

if (!string.Equals(command.Name, "create-tool", StringComparison.OrdinalIgnoreCase))
{
    Console.Error.WriteLine($"Unsupported command '{command.Name}'.");
    ToolCommand.WriteUsage();
    return 1;
}

try
{
    var generator = new ToolScaffoldingGenerator(Environment.CurrentDirectory);
    var result = generator.Generate(command.ToolId!, command.Template);

    Console.WriteLine($"Scaffolded tool '{result.ToolId}' using '{result.TemplateName}' template.");
    foreach (var file in result.GeneratedFiles)
    {
        Console.WriteLine($" - {file}");
    }

    Console.WriteLine();
    Console.WriteLine("Tool profile defaults:");
    Console.WriteLine(" - uiMode: auto");
    Console.WriteLine(" - complexityTier: 1");
    Console.WriteLine(" - runtimeLanguage: dotnet");
    Console.WriteLine(" - executionCapability: standard");

    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine(ex.Message);
    return 1;
}

internal sealed record ToolCommand(string Name, string? ToolId, ToolTemplateKind Template)
{
    public static ToolCommand? Parse(string[] args)
    {
        if (args.Length < 2)
        {
            return null;
        }

        var name = args[0].Trim();
        var toolId = args[1].Trim();
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(toolId))
        {
            return null;
        }

        var template = ToolTemplateKind.Utility;
        for (var i = 2; i < args.Length; i++)
        {
            if (string.Equals(args[i], "--template", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                template = ToolTemplateKindParser.Parse(args[i + 1]);
                i++;
            }
        }

        return new ToolCommand(name, toolId, template);
    }

    public static void WriteUsage()
    {
        Console.WriteLine("Usage: toolnexus create-tool <toolId> [--template utility|structured|custom-ui]");
    }
}
