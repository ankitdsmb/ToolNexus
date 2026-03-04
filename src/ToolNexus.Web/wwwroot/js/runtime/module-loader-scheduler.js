const DEFAULT_MAX_CONCURRENT_LOADS = 4;

function comparePriority(a, b) {
  if (b.priority !== a.priority) {
    return b.priority - a.priority;
  }

  return a.createdAt - b.createdAt;
}

export function createModuleLoaderScheduler(config = {}) {
  const maxConcurrentLoads = Number.isFinite(config.maxConcurrentLoads)
    ? Math.max(1, Math.floor(config.maxConcurrentLoads))
    : DEFAULT_MAX_CONCURRENT_LOADS;

  let activeLoads = 0;
  let sequence = 0;
  const queue = [];
  const inFlight = new Map();

  function drainQueue() {
    queue.sort(comparePriority);

    while (activeLoads < maxConcurrentLoads && queue.length > 0) {
      const request = queue.shift();
      if (!request) {
        break;
      }

      activeLoads += 1;
      Promise.resolve()
        .then(request.load)
        .then((module) => request.resolve(module))
        .catch((error) => request.reject(error))
        .finally(() => {
          activeLoads -= 1;
          inFlight.delete(request.key);
          drainQueue();
        });
    }
  }

  function scheduleLoad(key, load, options = {}) {
    if (inFlight.has(key)) {
      return inFlight.get(key);
    }

    const promise = new Promise((resolve, reject) => {
      queue.push({
        key,
        load,
        resolve,
        reject,
        priority: Number.isFinite(options.priority) ? options.priority : 0,
        createdAt: sequence++
      });

      drainQueue();
    });

    inFlight.set(key, promise);
    return promise;
  }

  return {
    scheduleLoad,
    getStats: () => ({
      maxConcurrentLoads,
      activeLoads,
      queuedLoads: queue.length,
      deduplicatedLoads: inFlight.size
    })
  };
}

export const runtimeModuleLoaderScheduler = createModuleLoaderScheduler();
