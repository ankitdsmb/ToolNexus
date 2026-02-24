import { createRuntimeLogger } from './runtime-logger.js';

const PREFIXES = {
  runtime: '[Runtime]',
  manifest: '[ManifestLoader]',
  dependency: '[DependencyLoader]',
  lifecycle: '[LifecycleResolver]',
  legacy: '[LegacyAdapter]',
  fallback: '[FallbackMode]'
};

function normalizePrefix(channel) {
  return PREFIXES[channel] ?? PREFIXES.runtime;
}

export function createRuntimeMigrationLogger({ channel = 'runtime', sink = console } = {}) {
  const prefix = normalizePrefix(channel);
  const runtimeLogger = createRuntimeLogger({ source: `runtime.${channel}`, sink });

  const write = (level, message, metadata) => {
    try {
      runtimeLogger[level](`${prefix} ${message}`, metadata);
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
