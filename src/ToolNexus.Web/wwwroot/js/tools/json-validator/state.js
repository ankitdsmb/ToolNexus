export function createState() {
  return {
    lastValidJson: '',
    autoValidateEnabled: false,
    schemaModeEnabled: false,
    strictModeEnabled: true,
    treeViewEnabled: false,
    autoValidateTimer: 0,
    isProcessing: false
  };
}
