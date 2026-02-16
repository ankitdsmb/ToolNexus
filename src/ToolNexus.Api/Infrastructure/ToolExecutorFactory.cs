using ToolNexus.Tools.Common;

namespace ToolNexus.Api.Infrastructure;

public interface IToolExecutorFactory
{
    IToolExecutor? Resolve(string slug);
}

public sealed class ToolExecutorFactory(IEnumerable<IToolExecutor> executors) : IToolExecutorFactory
{
    private readonly Dictionary<string, IToolExecutor> _bySlug = executors.ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

    public IToolExecutor? Resolve(string slug)
    {
        if (_bySlug.TryGetValue(slug, out var executor))
        {
            return executor;
        }

        return null;
    }
}
