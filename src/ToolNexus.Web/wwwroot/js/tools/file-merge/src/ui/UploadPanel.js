export class UploadPanel {
  #dropzone;
  #input;
  #list;
  #files = [];
  #onChange;

  constructor({ dropzone, input, list, onChange }) {
    this.#dropzone = dropzone;
    this.#input = input;
    this.#list = list;
    this.#onChange = onChange;
    this.#bindEvents();
  }

  getFiles() {
    return [...this.#files];
  }

  #bindEvents() {
    this.#dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.#dropzone.classList.add('is-dragging');
    });
    this.#dropzone.addEventListener('dragleave', () => this.#dropzone.classList.remove('is-dragging'));
    this.#dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.#dropzone.classList.remove('is-dragging');
      await this.#consumeFiles([...e.dataTransfer.files]);
    });

    this.#input.addEventListener('change', async () => {
      await this.#consumeFiles([...this.#input.files]);
      this.#input.value = '';
    });

    this.#list.addEventListener('dragstart', (event) => {
      const item = event.target.closest('[data-index]');
      if (!item) return;
      event.dataTransfer.setData('text/plain', item.dataset.index);
    });

    this.#list.addEventListener('dragover', (event) => event.preventDefault());
    this.#list.addEventListener('drop', (event) => {
      event.preventDefault();
      const sourceIndex = Number(event.dataTransfer.getData('text/plain'));
      const targetItem = event.target.closest('[data-index]');
      if (!targetItem) return;
      const targetIndex = Number(targetItem.dataset.index);
      if (sourceIndex === targetIndex) return;
      const [moved] = this.#files.splice(sourceIndex, 1);
      this.#files.splice(targetIndex, 0, moved);
      this.#render();
      this.#onChange(this.getFiles());
    });
  }

  async #consumeFiles(browserFiles) {
    const loaded = await Promise.all(browserFiles.map(async (file) => ({
      name: file.name,
      size: file.size,
      content: await file.text()
    })));

    this.#files.push(...loaded);
    this.#render();
    this.#onChange(this.getFiles());
  }

  #render() {
    this.#list.innerHTML = '';
    this.#files.forEach((file, index) => {
      const item = document.createElement('li');
      item.className = 'file-item';
      item.draggable = true;
      item.dataset.index = String(index);
      item.textContent = `${index + 1}. ${file.name} (${Math.round(file.size / 1024)} KB)`;
      this.#list.append(item);
    });
  }
}
