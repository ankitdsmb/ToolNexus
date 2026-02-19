export class SettingsPanel {
  #elements;

  constructor(elements) {
    this.#elements = elements;
  }

  getOptions() {
    return {
      mergeMode: this.#elements.mergeMode.value,
      jsonMode: this.#elements.jsonMode.value,
      includeHeaders: this.#elements.includeHeaders.checked,
      separator: this.#elements.separator.value,
      preserveOrder: this.#elements.preserveOrder.checked,
      conflictMode: this.#elements.conflictMode.value,
      maxTotalSizeBytes: Number(this.#elements.maxSize.value) * 1024 * 1024
    };
  }
}
