import { jest } from '@jest/globals';
import { createRuntimeMigrationLogger } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-migration-logger.js';

describe('runtime migration logger', () => {
  test('emits scoped prefix for configured channel', () => {
    const sink = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    const logger = createRuntimeMigrationLogger({ channel: 'dependency', sink });
    logger.info('Loaded dependency', { toolSlug: 'json-formatter' });

    expect(sink.info).toHaveBeenCalledWith('[runtime.dependency] [DependencyLoader] Loaded dependency', { toolSlug: 'json-formatter' });
  });

  test('swallows sink failures to preserve runtime compatibility', () => {
    const logger = createRuntimeMigrationLogger({
      channel: 'runtime',
      sink: {
        warn: () => {
          throw new Error('log sink unavailable');
        }
      }
    });

    expect(() => logger.warn('Safe warn')).not.toThrow();
  });
});
