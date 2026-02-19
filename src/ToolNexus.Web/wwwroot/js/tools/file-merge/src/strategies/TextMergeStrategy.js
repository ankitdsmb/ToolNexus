export class TextMergeStrategy {
  canHandle(fileType) {
    return fileType === 'text';
  }

  async merge(files, options) {
    return options.workerClient.execute('text', files, options);
  }
}
