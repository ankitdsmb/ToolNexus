const DEFAULT_EXECUTION_PATH_PREFIX = '/api/v1/tools';

function normalizePathPrefix(pathPrefix) {
  const normalized = (pathPrefix ?? '').toString().trim();
  if (!normalized) {
    return DEFAULT_EXECUTION_PATH_PREFIX;
  }

  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function escapeLabel(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeStringify(payload) {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return 'Unable to serialize JSON response.';
  }
}

function defaultSchemaFromManifest(manifest) {
  const schema = manifest?.operationSchema ?? globalThis.window?.ToolNexusConfig?.tool?.operationSchema;
  if (schema && typeof schema === 'object') {
    return schema;
  }

  return null;
}

function flattenFields(schema) {
  const properties = schema?.properties && typeof schema.properties === 'object' ? schema.properties : null;
  if (!properties) {
    return [];
  }

  const required = Array.isArray(schema.required) ? new Set(schema.required) : new Set();
  const fields = [];
  for (const [name, definition] of Object.entries(properties)) {
    const field = definition && typeof definition === 'object' ? definition : {};
    fields.push({
      name,
      title: field.title ?? name,
      description: field.description ?? '',
      type: field.format === 'textarea' ? 'textarea' : field.type ?? 'text',
      defaultValue: field.default,
      required: required.has(name),
      group: field.group ?? field['x-group'] ?? 'General',
      hint: field.hint ?? field['x-hint'] ?? ''
    });
  }

  return fields;
}

function buildInputControl(doc, field) {
  const row = doc.createElement('div');
  row.className = 'tool-auto-runtime__field';
  row.dataset.field = field.name;

  const label = doc.createElement('label');
  label.htmlFor = `tool-auto-${field.name}`;
  label.textContent = field.required ? `${field.title} *` : field.title;

  let input;
  switch (field.type) {
    case 'number':
      input = doc.createElement('input');
      input.type = 'number';
      input.value = field.defaultValue ?? '';
      break;
    case 'boolean':
      input = doc.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(field.defaultValue);
      break;
    case 'textarea':
      input = doc.createElement('textarea');
      input.rows = 8;
      input.value = field.defaultValue ?? '';
      break;
    case 'json':
      input = doc.createElement('textarea');
      input.rows = 10;
      input.value = typeof field.defaultValue === 'string' ? field.defaultValue : safeStringify(field.defaultValue ?? {});
      input.placeholder = '{\n  "key": "value"\n}';
      break;
    case 'text':
    default:
      input = doc.createElement('input');
      input.type = 'text';
      input.value = field.defaultValue ?? '';
      break;
  }

  input.id = `tool-auto-${field.name}`;
  input.dataset.field = field.name;
  input.dataset.fieldType = field.type;

  row.append(label, input);

  if (field.description || field.hint) {
    const hint = doc.createElement('p');
    hint.className = 'tool-auto-runtime__hint';
    hint.textContent = [field.description, field.hint].filter(Boolean).join(' · ');
    row.append(hint);
  }

  return { row, input };
}

function createExecutionError(doc, message) {
  const panel = doc.createElement('div');
  panel.className = 'tool-auto-runtime__error';
  panel.setAttribute('role', 'alert');
  panel.textContent = message;
  return panel;
}

function extractAction() {
  const tool = globalThis.window?.ToolNexusConfig?.tool ?? {};
  return tool.clientSafeActions?.[0] ?? tool.actions?.[0] ?? 'execute';
}

async function executeTool({ slug, payload }) {
  const apiBase = (window.ToolNexusConfig?.apiBaseUrl ?? '').trim().replace(/\/$/, '');
  const pathPrefix = normalizePathPrefix(window.ToolNexusConfig?.toolExecutionPathPrefix);
  const action = extractAction();
  const endpointPath = `${pathPrefix}/${encodeURIComponent(slug)}/${encodeURIComponent(action)}`;
  const endpoint = apiBase ? `${apiBase}${endpointPath}` : endpointPath;

  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: JSON.stringify(payload) })
  });

  let responsePayload = null;
  try {
    responsePayload = await response.json();
  } catch {
    throw new Error(`Execution failed (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(responsePayload?.error ?? responsePayload?.detail ?? 'Execution failed.');
  }

  return responsePayload;
}

function readFieldValue(input) {
  const type = input.dataset.fieldType ?? 'text';

  if (type === 'boolean') {
    return Boolean(input.checked);
  }

  if (type === 'number') {
    if (!input.value.trim()) {
      return null;
    }

    return Number(input.value);
  }

  if (type === 'json') {
    if (!input.value.trim()) {
      return null;
    }

    return JSON.parse(input.value);
  }

  return input.value;
}

function buildFieldGroups(doc, fields) {
  const byGroup = new Map();
  for (const field of fields) {
    const list = byGroup.get(field.group) ?? [];
    list.push(field);
    byGroup.set(field.group, list);
  }

  const groups = [];
  for (const [groupName, groupFields] of byGroup.entries()) {
    const section = doc.createElement('section');
    section.className = 'tool-auto-runtime__group';
    section.innerHTML = `<h3>${escapeLabel(groupName)}</h3>`;
    groups.push({ section, fields: groupFields });
  }

  return groups;
}

function renderTierError(root, tier, uiMode) {
  root.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'tool-auto-runtime tool-auto-runtime--error tn-tool-shell';
  panel.append(createExecutionError(document, `Tool UI configuration error: complexity tier ${tier} requires custom UI, but uiMode is "${uiMode}".`));
  root.append(panel);
}

export function createAutoToolRuntimeModule({ manifest, slug }) {
  const complexityTier = Number(manifest?.complexityTier ?? 1);
  const uiMode = String(manifest?.uiMode ?? 'auto').trim().toLowerCase() || 'auto';

  return {
    toolRuntimeType: 'mount',
    useAutoInputs(root, runtimeContext = {}) {
      const doc = root?.ownerDocument ?? document;
      const schema = defaultSchemaFromManifest(manifest);
      const fields = flattenFields(schema);

      const autoShell = doc.createElement('section');
      autoShell.className = 'tool-auto-runtime tn-tool-shell';
      autoShell.dataset.uiMode = uiMode;
      autoShell.dataset.complexityTier = String(complexityTier);
      autoShell.innerHTML = '<header class="tn-tool-header"><h2>Auto-generated tool UI</h2></header>';

      const body = doc.createElement('section');
      body.className = 'tn-tool-body tool-auto-runtime__body';
      const inputPanel = doc.createElement('section');
      inputPanel.className = 'tn-tool-panel tool-auto-runtime__input';
      const outputPanel = doc.createElement('section');
      outputPanel.className = 'tn-tool-panel tool-auto-runtime__output';

      const runButton = doc.createElement('button');
      runButton.type = 'button';
      runButton.className = 'tool-btn tool-btn--primary';
      runButton.textContent = 'Run tool';

      const status = doc.createElement('p');
      status.className = 'tool-auto-runtime__status';
      status.textContent = 'Ready';
      status.setAttribute('role', 'status');

      const output = doc.createElement('pre');
      output.className = 'tool-auto-runtime__result';
      output.textContent = 'No output yet.';
      outputPanel.append(output);

      const controls = [];
      if (!fields.length) {
        const fallback = {
          name: 'payload',
          title: 'JSON payload',
          type: 'json',
          required: false,
          description: 'Schema unavailable. Provide raw JSON payload.',
          group: 'General',
          hint: ''
        };
        const control = buildInputControl(doc, fallback);
        inputPanel.append(control.row);
        controls.push({ field: fallback, input: control.input });
      } else if (complexityTier >= 2) {
        for (const group of buildFieldGroups(doc, fields)) {
          for (const field of group.fields) {
            const control = buildInputControl(doc, field);
            group.section.append(control.row);
            controls.push({ field, input: control.input });
          }
          inputPanel.append(group.section);
        }
      } else {
        for (const field of fields) {
          const control = buildInputControl(doc, field);
          inputPanel.append(control.row);
          controls.push({ field, input: control.input });
        }
      }

      const form = doc.createElement('div');
      form.className = 'tool-auto-runtime__actions';
      form.append(runButton, status);
      inputPanel.append(form);

      body.append(inputPanel, outputPanel);
      autoShell.append(body);

      const errorZone = doc.createElement('div');
      errorZone.className = 'tool-auto-runtime__errors';
      autoShell.append(errorZone);

      const run = async () => {
        errorZone.replaceChildren();

        const payload = {};
        try {
          for (const { field, input } of controls) {
            const value = readFieldValue(input);
            if (field.required && (value === null || value === '')) {
              throw new Error(`Field "${field.title}" is required.`);
            }

            if (value !== null && value !== '') {
              payload[field.name] = value;
            }
          }
        } catch (error) {
          errorZone.append(createExecutionError(doc, error?.message ?? 'Invalid input.'));
          return;
        }

        runButton.disabled = true;
        status.textContent = 'Running…';

        try {
          const result = await executeTool({ slug, payload });
          output.textContent = safeStringify(result);
          status.textContent = 'Completed';
        } catch (error) {
          status.textContent = 'Execution failed';
          errorZone.append(createExecutionError(doc, error?.message ?? 'Execution failed.'));
        } finally {
          runButton.disabled = false;
        }
      };

      runButton.addEventListener('click', run);
      runtimeContext.addCleanup?.(() => runButton.removeEventListener('click', run));

      root.innerHTML = '';
      root.append(autoShell);

      return { controls, runButton, output, status };
    },
    create(root) {
      if (!root) {
        return null;
      }

      if (complexityTier >= 4 && uiMode === 'auto') {
        renderTierError(root, complexityTier, uiMode);
        return { root, blocked: true };
      }

      return { root, blocked: false };
    },
    init(instance, root, context) {
      const effectiveRoot = instance?.root ?? root;
      if (!effectiveRoot || instance?.blocked) {
        return instance;
      }

      this.useAutoInputs(effectiveRoot, context);
      return { ...instance, mounted: true };
    },
    destroy() {}
  };
}
