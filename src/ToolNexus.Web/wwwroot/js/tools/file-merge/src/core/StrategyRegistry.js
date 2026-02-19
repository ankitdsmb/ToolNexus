export class StrategyRegistry {
  #strategies;

  constructor(strategies) {
    this.#strategies = [...strategies];
  }

  resolve(fileType) {
    return this.#strategies.find((strategy) => strategy.canHandle(fileType)) ?? this.#strategies[0];
  }
}
