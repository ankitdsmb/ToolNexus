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

const state = { mergedContent: '', mergedType: 'text' };

function init() {
  const workerClient = new WorkerClient('/js/tools/file-merge/src/worker/mergeWorker.js');
  const registry = new StrategyRegistry([
    new TextMergeStrategy(),
    new JsonMergeStrategy(),
    new CsvMergeStrategy(),
    new XmlMergeStrategy(),
    new YamlMergeStrategy()
  ]);
  const mergeEngine = new MergeEngine(registry);

  const upload = new UploadPanel({
    dropzone: document.getElementById('dropzone'),
    input: document.getElementById('fileInput'),
    list: document.getElementById('fileList'),
    onChange: () => {}
  });

  const settings = new SettingsPanel({
    mergeMode: document.getElementById('mergeMode'),
    jsonMode: document.getElementById('jsonMode'),
    includeHeaders: document.getElementById('includeHeaders'),
    separator: document.getElementById('separator'),
    preserveOrder: document.getElementById('preserveOrder'),
    conflictMode: document.getElementById('conflictMode'),
    maxSize: document.getElementById('maxSizeMb')
  });

  const preview = new PreviewPanel(document.getElementById('previewOutput'));
  const stats = new StatsPanel(document.getElementById('mergeStats'));

  document.getElementById('mergeBtn').addEventListener('click', () => runMerge(upload, settings, mergeEngine, preview, stats, workerClient));
  document.getElementById('copyBtn').addEventListener('click', async () => navigator.clipboard.writeText(state.mergedContent));
  document.getElementById('downloadBtn').addEventListener('click', () => downloadResult(state.mergedContent));

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      runMerge(upload, settings, mergeEngine, preview, stats, workerClient);
    }
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      downloadResult(state.mergedContent);
    }
  });
}

async function runMerge(upload, settings, mergeEngine, preview, stats, workerClient) {
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

function downloadResult(content) {
  if (!content) return;
  const outputName = (document.getElementById('outputName').value || 'merged-output').trim();
  const extension = document.getElementById('outputExtension').value;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${outputName}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', init);
