const PREFIXES = {
  runtime: '[ToolRuntime]',
  dependency: '[DependencyLoader]',
  lifecycle: '[LifecycleAdapter]',
  legacy: '[LegacyFallback]'
};

function normalizePrefix(channel) {
  return PREFIXES[channel] ?? PREFIXES.runtime;
}

export function createRuntimeMigrationLogger({ channel = 'runtime', sink = console } = {}) {
  const prefix = normalizePrefix(channel);

  const write = (level, message, metadata) => {
    try {
      if (typeof sink?.[level] !== 'function') {
        return;
      }

      if (metadata === undefined) {
        sink[level](`${prefix} ${message}`);
        return;
      }

      sink[level](`${prefix} ${message}`, metadata);
    } catch {
      // logging should never interrupt runtime execution
    }
  };

  return {
    debug: (message, metadata) => write('debug', message, metadata),
    info: (message, metadata) => write('info', message, metadata),
    warn: (message, metadata) => write('warn', message, metadata),
    error: (message, metadata) => write('error', message, metadata)
  };
}

export const runtimeMigrationLogger = createRuntimeMigrationLogger({ channel: 'runtime' });
