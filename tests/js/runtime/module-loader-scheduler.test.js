import { createModuleLoaderScheduler } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/module-loader-scheduler.js';

describe('module-loader-scheduler', () => {
  test('deduplicates concurrent key requests', async () => {
    const scheduler = createModuleLoaderScheduler({ maxConcurrentLoads: 1 });
    const load = jest.fn(async () => ({ ok: true }));

    const [a, b] = await Promise.all([
      scheduler.scheduleLoad('css-minifier', load, { priority: 10 }),
      scheduler.scheduleLoad('css-minifier', load, { priority: 10 })
    ]);

    expect(a).toEqual({ ok: true });
    expect(a).toBe(b);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
