import { emitRuntimeEvent, __resetRuntimeEventLogThrottleForTests } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/telemetry/runtime-event-logger.js';
import { TR_EXECUTION_START } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/telemetry/runtime-event-types.js';

describe('runtime-event-logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    __resetRuntimeEventLogThrottleForTests();
  });

  afterEach(() => {
    console.info.mockRestore();
  });

  test('emits structured runtime events', () => {
    emitRuntimeEvent(TR_EXECUTION_START, { slug: 'json-formatter' });

    expect(console.info).toHaveBeenCalledWith(
      '[ToolNexus Runtime]',
      'TR_EXECUTION_START',
      { slug: 'json-formatter' }
    );
  });

  test('throttles duplicate payloads', () => {
    emitRuntimeEvent(TR_EXECUTION_START, { slug: 'json-formatter' });
    emitRuntimeEvent(TR_EXECUTION_START, { slug: 'json-formatter' });

    expect(console.info).toHaveBeenCalledTimes(1);
  });
});
