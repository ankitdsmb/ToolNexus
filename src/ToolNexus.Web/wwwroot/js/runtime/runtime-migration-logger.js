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
  const levelForMessage = (level, message = '') => {
    if (channel === 'runtime' && /monaco/iu.test(message)) {
      return level === 'error' ? 'warn' : 'debug';
    }

    return level;
  };

  const write = (level, message, metadata) => {
    try {
      const normalizedLevel = levelForMessage(level, message);
      runtimeLogger[normalizedLevel](`${prefix} ${message}`, { channel, requestedLevel: level, ...metadata });
    } catch {
      // logging should never interrupt runtime execution
    }
  };

  return {
    beginSession: (sessionId) => runtimeLogger.beginSession?.(sessionId),
    endSession: (reason) => runtimeLogger.endSession?.(reason),
    summary: (level, reason) => runtimeLogger.summary?.(level, reason),
    debug: (message, metadata) => write('debug', message, metadata),
    info: (message, metadata) => write('info', message, metadata),
    warn: (message, metadata) => write('warn', message, metadata),
    error: (message, metadata) => write('error', message, metadata)
  };
}

export const runtimeMigrationLogger = createRuntimeMigrationLogger({ channel: 'runtime' });
