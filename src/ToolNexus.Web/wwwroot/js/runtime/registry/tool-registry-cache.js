let cachedRegistry = null;
let cachePromise = null;

export function getCachedToolRegistry() {
  return cachedRegistry;
}

export function setCachedToolRegistry(registry) {
  cachedRegistry = registry;
  return cachedRegistry;
}

export function getCachedToolRegistryPromise() {
  return cachePromise;
}

export function setCachedToolRegistryPromise(promise) {
  cachePromise = promise;
  return cachePromise;
}

export function resetToolRegistryCache() {
  cachedRegistry = null;
  cachePromise = null;
}
