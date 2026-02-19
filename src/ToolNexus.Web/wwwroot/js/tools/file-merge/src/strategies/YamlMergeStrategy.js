export class YamlMergeStrategy {
  canHandle(fileType) {
    return fileType === 'yaml';
  }

  async merge(files, options) {
    return options.workerClient.execute('yaml', files, options);
  }
}
