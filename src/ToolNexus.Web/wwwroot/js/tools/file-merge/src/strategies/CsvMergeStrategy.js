export class CsvMergeStrategy {
  canHandle(fileType) {
    return fileType === 'csv';
  }

  async merge(files, options) {
    return options.workerClient.execute('csv', files, options);
  }
}
