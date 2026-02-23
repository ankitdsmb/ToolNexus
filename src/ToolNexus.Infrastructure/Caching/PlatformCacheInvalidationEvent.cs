namespace ToolNexus.Infrastructure.Caching;

public sealed record PlatformCacheInvalidationEvent(string Key, bool IsPrefix);
