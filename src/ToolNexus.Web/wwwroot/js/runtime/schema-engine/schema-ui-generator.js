function createLabel(doc, text, id) {
  const label = doc.createElement('label');
  label.htmlFor = id;
  label.textContent = text;
  return label;
}

function createField(doc, field, prefix) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'schema-tool__field';

  const id = `${prefix}-${field.name}`;
  const label = createLabel(doc, field.label || field.name, id);
  wrapper.append(label);

  let input = null;
  if (field.type === 'textarea') {
    input = doc.createElement('textarea');
    input.rows = Number.isFinite(field.rows) ? field.rows : 8;
  } else {
    input = doc.createElement('input');
    input.type = field.type === 'number' ? 'number' : 'text';
  }

  input.id = id;
  input.name = field.name;
  input.placeholder = field.placeholder || '';
  input.dataset.schemaField = field.name;
  wrapper.append(input);

  return { wrapper, input };
}

export function renderSchemaToolUi(root, schema, { doc = document, onRun } = {}) {
  const inputAnchor = root?.querySelector?.('[data-tool-input]');
  const outputAnchor = root?.querySelector?.('[data-tool-output]');
  const statusAnchor = root?.querySelector?.('[data-tool-status]');

  if (!inputAnchor || !outputAnchor) {
    throw new Error('Schema tool requires ToolShell anchors: [data-tool-input] and [data-tool-output].');
  }

  inputAnchor.replaceChildren();
  outputAnchor.replaceChildren();

  const controls = new Map();
  for (const inputField of schema.inputs) {
    const field = createField(doc, inputField, `schema-input-${schema.slug}`);
    inputAnchor.append(field.wrapper);
    controls.set(inputField.name, field.input);
  }

  const runButton = doc.createElement('button');
  runButton.type = 'button';
  runButton.className = 'schema-tool__run';
  runButton.textContent = 'Run';
  runButton.addEventListener('click', () => onRun?.());
  inputAnchor.append(runButton);

  const outputs = new Map();
  for (const outputField of schema.outputs) {
    const field = createField(doc, outputField, `schema-output-${schema.slug}`);
    field.input.readOnly = true;
    outputAnchor.append(field.wrapper);
    outputs.set(outputField.name, field.input);
  }

  if (statusAnchor) {
    statusAnchor.textContent = 'Ready';
  }

  return {
    controls,
    outputs,
    setStatus(message) {
      if (statusAnchor) {
        statusAnchor.textContent = message;
      }
    }
  };
}
