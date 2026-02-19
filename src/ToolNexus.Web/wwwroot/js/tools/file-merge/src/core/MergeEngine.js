export class MergeEngine {
  #registry;

  constructor(registry) {
    this.#registry = registry;
  }

  async merge(files, fileType, options) {
    const strategy = this.#registry.resolve(fileType);
    return strategy.merge(files, options);
  }
}
