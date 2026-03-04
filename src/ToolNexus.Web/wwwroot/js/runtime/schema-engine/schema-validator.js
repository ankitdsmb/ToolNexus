const SUPPORTED_INPUT_TYPES = new Set(['text', 'textarea', 'number']);
const SUPPORTED_OUTPUT_TYPES = new Set(['text', 'textarea']);

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function validateToolSchema(schema, { expectedSlug } = {}) {
  const errors = [];
  if (!schema || typeof schema !== 'object') {
    return {
      valid: false,
      errors: ['Schema payload must be a JSON object.'],
      schema: null
    };
  }

  const slug = String(schema.slug ?? '').trim();
  if (!slug) {
    errors.push('Schema is missing "slug".');
  }

  if (expectedSlug && slug && slug !== expectedSlug) {
    errors.push(`Schema slug mismatch. Expected "${expectedSlug}" but found "${slug}".`);
  }

  const inputs = toArray(schema.inputs).map((field, index) => {
    const type = String(field?.type ?? 'text').trim().toLowerCase();
    const name = String(field?.name ?? '').trim();

    if (!name) {
      errors.push(`Input #${index + 1} is missing "name".`);
    }

    if (!SUPPORTED_INPUT_TYPES.has(type)) {
      errors.push(`Input "${name || index + 1}" has unsupported type "${type}".`);
    }

    return {
      type,
      name,
      label: String(field?.label ?? name).trim() || name,
      placeholder: String(field?.placeholder ?? '').trim(),
      rows: Number(field?.rows ?? 8)
    };
  });

  const actions = toArray(schema.actions).map((action, index) => {
    const operation = String(action?.operation ?? '').trim();
    if (!operation) {
      errors.push(`Action #${index + 1} is missing "operation".`);
    }

    return {
      operation,
      from: String(action?.from ?? action?.input ?? '').trim(),
      to: String(action?.to ?? action?.output ?? '').trim()
    };
  });

  const outputs = toArray(schema.outputs).map((field, index) => {
    const type = String(field?.type ?? 'textarea').trim().toLowerCase();
    const name = String(field?.name ?? '').trim();

    if (!name) {
      errors.push(`Output #${index + 1} is missing "name".`);
    }

    if (!SUPPORTED_OUTPUT_TYPES.has(type)) {
      errors.push(`Output "${name || index + 1}" has unsupported type "${type}".`);
    }

    return {
      type,
      name,
      label: String(field?.label ?? name).trim() || name,
      rows: Number(field?.rows ?? 8)
    };
  });

  if (actions.length === 0) {
    errors.push('Schema must define at least one action.');
  }

  if (inputs.length === 0) {
    errors.push('Schema must define at least one input.');
  }

  if (outputs.length === 0) {
    errors.push('Schema must define at least one output.');
  }

  return {
    valid: errors.length === 0,
    errors,
    schema: {
      slug,
      inputs,
      actions,
      outputs
    }
  };
}
