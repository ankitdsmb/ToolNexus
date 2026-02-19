export class StatsPanel {
  #element;

  constructor(element) {
    this.#element = element;
  }

  render(stats) {
    this.#element.textContent = `Files: ${stats.fileCount} | In: ${stats.totalBefore} B | Out: ${stats.totalAfter} B | Time: ${stats.durationMs} ms`;
  }
}
