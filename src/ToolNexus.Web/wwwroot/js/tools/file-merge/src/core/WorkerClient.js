export class WorkerClient {
  #worker;
  #requestId = 0;
  #pending = new Map();

  constructor(workerUrl) {
    this.#worker = new Worker(workerUrl, { type: 'module' });
    this.#worker.addEventListener('message', (event) => {
      const { id, ok, payload, error } = event.data;
      const resolver = this.#pending.get(id);
      if (!resolver) return;
      this.#pending.delete(id);
      if (ok) {
        resolver.resolve(payload);
      } else {
        resolver.reject(new Error(error));
      }
    });
  }

  execute(strategy, files, options) {
    const id = ++this.#requestId;
    this.#worker.postMessage({ id, strategy, files, options });
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
    });
  }
}
