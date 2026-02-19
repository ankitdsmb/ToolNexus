self.addEventListener('message', (event) => {
  const { id, strategy, files, options } = event.data;
  const started = performance.now();

  try {
    const merged = executeMerge(strategy, files, options);
    const durationMs = Math.round(performance.now() - started);
    self.postMessage({
      id,
      ok: true,
      payload: {
        content: merged,
        stats: {
          fileCount: files.length,
          totalBefore: files.reduce((sum, file) => sum + file.content.length, 0),
          totalAfter: merged.length,
          durationMs
        }
      }
    });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'Merge failed.' });
  }
});

function executeMerge(strategy, files, options) {
  if (!Array.isArray(files) || files.length === 0) throw new Error('No files supplied.');
  const ordered = options.preserveOrder ? files : [...files].sort((a, b) => a.name.localeCompare(b.name));

  switch (strategy) {
    case 'json': return mergeJson(ordered, options);
    case 'csv': return mergeCsv(ordered);
    case 'xml': return mergeXml(ordered);
    case 'yaml': return mergeYaml(ordered, options);
    default: return mergeText(ordered, options);
  }
}

function mergeText(files, options) {
  const separator = options.includeHeaders ? `\n${options.separator || '-----'}\n` : '\n';
  return files.map((file) => file.content.replace(/\r\n/g, '\n')).join(separator);
}

function mergeJson(files, options) {
  const parsed = files.map((file) => JSON.parse(file.content));
  const allArrays = parsed.every(Array.isArray);
  if (allArrays) return JSON.stringify(parsed.flat(), null, 2);

  const merged = {};
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) throw new Error('JSON merge requires objects or arrays.');
    applyObjectMerge(merged, entry, options.jsonMode, options.conflictMode);
  }
  return JSON.stringify(merged, null, 2);
}

function applyObjectMerge(target, source, mode, conflictMode) {
  for (const [key, value] of Object.entries(source)) {
    if (!(key in target)) {
      target[key] = value;
      continue;
    }

    if (mode === 'deep' && isObject(target[key]) && isObject(value)) {
      applyObjectMerge(target[key], value, mode, conflictMode);
      continue;
    }

    if (conflictMode === 'preserve') continue;
    if (conflictMode === 'rename') {
      let i = 1;
      while (`${key}_${i}` in target) i += 1;
      target[`${key}_${i}`] = value;
      continue;
    }

    target[key] = value;
  }
}

function mergeCsv(files) {
  const tables = files.map((file) => parseCsv(file.content));
  const headerSet = new Set(tables.flatMap((table) => table.headers));
  const headers = [...headerSet];
  const lines = [headers.join(',')];

  for (const table of tables) {
    for (const row of table.rows) {
      lines.push(headers.map((header) => escapeCsv(row[header] ?? '')).join(','));
    }
  }

  return lines.join('\n');
}

function parseCsv(content) {
  const delimiter = [',', ';', '\t', '|']
    .map((candidate) => ({ candidate, score: (content.split('\n')[0] || '').split(candidate).length }))
    .sort((a, b) => b.score - a.score)[0].candidate;

  const [head, ...lines] = content.split(/\r?\n/).filter(Boolean);
  const headers = head.split(delimiter).map((h) => h.trim());
  const rows = lines.map((line) => {
    const values = line.split(delimiter);
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index] ?? ''; });
    return row;
  });

  return { headers, rows };
}

function escapeCsv(value) {
  return /[",\n]/.test(value) ? `"${String(value).replaceAll('"', '""')}"` : String(value);
}

function mergeXml(files) {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const docs = files.map((file) => {
    const xml = parser.parseFromString(file.content, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error(`Invalid XML in ${file.name}.`);
    return xml;
  });

  const base = docs[0];
  const root = base.documentElement;

  docs.slice(1).forEach((doc) => {
    [...doc.documentElement.childNodes].forEach((node) => root.appendChild(base.importNode(node, true)));
  });

  return serializer.serializeToString(base);
}

function mergeYaml(files, options) {
  const asObjects = files.map((file) => parseYaml(file.content));
  const merged = {};
  for (const obj of asObjects) {
    applyObjectMerge(merged, obj, options.jsonMode, options.conflictMode);
  }
  return toYaml(merged);
}

function parseYaml(content) {
  const lines = content.split(/\r?\n/);
  const root = {};
  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const raw = line.slice(idx + 1).trim();
    root[key] = inferScalar(raw);
  }
  return root;
}

function toYaml(obj, depth = 0) {
  const indent = '  '.repeat(depth);
  return Object.entries(obj).map(([k, v]) => {
    if (isObject(v)) return `${indent}${k}:\n${toYaml(v, depth + 1)}`;
    return `${indent}${k}: ${String(v)}`;
  }).join('\n');
}

function inferScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  const num = Number(value);
  return Number.isNaN(num) ? value.replace(/^['"]|['"]$/g, '') : num;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}
