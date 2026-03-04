import { FileAnalyzer } from './src/core/FileAnalyzer.js';
import { StrategyRegistry } from './src/core/StrategyRegistry.js';
import { MergeEngine } from './src/core/MergeEngine.js';
import { WorkerClient } from './src/core/WorkerClient.js';
import { TextMergeStrategy } from './src/strategies/TextMergeStrategy.js';
import { JsonMergeStrategy } from './src/strategies/JsonMergeStrategy.js';
import { CsvMergeStrategy } from './src/strategies/CsvMergeStrategy.js';
import { XmlMergeStrategy } from './src/strategies/XmlMergeStrategy.js';
import { YamlMergeStrategy } from './src/strategies/YamlMergeStrategy.js';
import { UploadPanel } from './src/ui/UploadPanel.js';
import { SettingsPanel } from './src/ui/SettingsPanel.js';
import { PreviewPanel } from './src/ui/PreviewPanel.js';
import { StatsPanel } from './src/ui/StatsPanel.js';

const runtimeState = {
  root: null,
  mergedContent: '',
  mergedType: 'text',
  workerClient: null,
  handlers: []
};

function getRequiredElement(root, id) {
  const element = root?.querySelector?.(`#${id}`);
  if (!element) {
    throw new Error(`[file-merge] missing required DOM node: #${id}`);
  }

  return element;
}

export function create(context = {}) {
  const root = context?.root ?? context?.toolRoot ?? document;
  runtimeState.root = root;
  runtimeState.mergedContent = '';
  runtimeState.mergedType = 'text';
  runtimeState.handlers = [];

  return runtimeState;
}

export async function init(state = runtimeState) {
  const root = state?.root ?? document;
  const workerClient = new WorkerClient('/js/tools/file-merge/src/worker/mergeWorker.js');
  state.workerClient = workerClient;

  const registry = new StrategyRegistry([
    new TextMergeStrategy(),
    new JsonMergeStrategy(),
    new CsvMergeStrategy(),
    new XmlMergeStrategy(),
    new YamlMergeStrategy()
  ]);
  const mergeEngine = new MergeEngine(registry);

  const upload = new UploadPanel({
    dropzone: getRequiredElement(root, 'dropzone'),
    input: getRequiredElement(root, 'fileInput'),
    list: getRequiredElement(root, 'fileList'),
    onChange: () => {}
  });

  const settings = new SettingsPanel({
    mergeMode: getRequiredElement(root, 'mergeMode'),
    jsonMode: getRequiredElement(root, 'jsonMode'),
    includeHeaders: getRequiredElement(root, 'includeHeaders'),
    separator: getRequiredElement(root, 'separator'),
    preserveOrder: getRequiredElement(root, 'preserveOrder'),
    conflictMode: getRequiredElement(root, 'conflictMode'),
    maxSize: getRequiredElement(root, 'maxSizeMb')
  });

  const preview = new PreviewPanel(getRequiredElement(root, 'previewOutput'));
  const stats = new StatsPanel(getRequiredElement(root, 'mergeStats'));

  const mergeButton = getRequiredElement(root, 'mergeBtn');
  const copyButton = getRequiredElement(root, 'copyBtn');
  const downloadButton = getRequiredElement(root, 'downloadBtn');

  const handleMerge = () => runMerge(upload, settings, mergeEngine, preview, stats, workerClient, state);
  const handleCopy = async () => navigator.clipboard.writeText(state.mergedContent);
  const handleDownload = () => downloadResult(state.mergedContent, root);

  mergeButton.addEventListener('click', handleMerge);
  copyButton.addEventListener('click', handleCopy);
  downloadButton.addEventListener('click', handleDownload);

  const handleKeydown = (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      handleMerge();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      handleDownload();
    }
  };

  window.addEventListener('keydown', handleKeydown);

  state.handlers.push(
    { element: mergeButton, event: 'click', handler: handleMerge },
    { element: copyButton, event: 'click', handler: handleCopy },
    { element: downloadButton, event: 'click', handler: handleDownload },
    { element: window, event: 'keydown', handler: handleKeydown }
  );
}

async function runMerge(upload, settings, mergeEngine, preview, stats, workerClient, state) {
  const files = upload.getFiles();
  if (!files.length) return;

  const options = settings.getOptions();
  const totalBytes = files.reduce((sum, f) => sum + FileAnalyzer.getByteSize(f.content), 0);
  if (totalBytes > options.maxTotalSizeBytes) {
    alert('File limit exceeded. Increase limit or remove files.');
    return;
  }

  const analyzed = files.map((file) => ({ ...file, fileType: FileAnalyzer.detectType(file.name, file.content) }));
  const dominantType = analyzed.every((f) => f.fileType === analyzed[0].fileType) ? analyzed[0].fileType : 'text';

  const { content, stats: mergeStats } = await mergeEngine.merge(analyzed, dominantType, { ...options, workerClient });
  state.mergedContent = content;
  state.mergedType = dominantType;

  preview.render(content, dominantType);
  stats.render(mergeStats);
}

function downloadResult(content, root) {
  if (!content) return;
  const outputName = (getRequiredElement(root, 'outputName').value || 'merged-output').trim();
  const extension = getRequiredElement(root, 'outputExtension').value;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${outputName}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function destroy(state = runtimeState) {
  for (const { element, event, handler } of state.handlers ?? []) {
    element?.removeEventListener?.(event, handler);
  }

  state.workerClient?.dispose?.();
  state.handlers = [];
  state.workerClient = null;
  state.mergedContent = '';
  state.mergedType = 'text';
}
