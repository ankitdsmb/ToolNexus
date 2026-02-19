export class XmlMergeStrategy {
  canHandle(fileType) {
    return fileType === 'xml';
  }

  async merge(files, options) {
    return options.workerClient.execute('xml', files, options);
  }
}
