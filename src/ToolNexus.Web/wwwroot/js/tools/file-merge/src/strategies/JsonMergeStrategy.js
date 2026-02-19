export class JsonMergeStrategy {
  canHandle(fileType) {
    return fileType === 'json';
  }

  async merge(files, options) {
    return options.workerClient.execute('json', files, options);
  }
}
