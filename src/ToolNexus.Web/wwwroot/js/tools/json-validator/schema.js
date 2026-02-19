export function validateWithSchema(data, schema) {
  const issues = [];
  validateNode(data, schema, '$', issues);
  return issues;
}

function validateNode(data, schema, path, issues) {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  if (schema.type && !matchesType(data, schema.type)) {
    issues.push(`${path} should be type ${schema.type}.`);
    return;
  }

  if (schema.type === 'object' && data && typeof data === 'object' && !Array.isArray(data)) {
    const requiredFields = Array.isArray(schema.required) ? schema.required : [];
    for (const requiredField of requiredFields) {
      if (!(requiredField in data)) {
        issues.push(`${path}.${requiredField} is required.`);
      }
    }

    const properties = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
    for (const [key, value] of Object.entries(data)) {
      if (properties[key]) {
        validateNode(value, properties[key], `${path}.${key}`, issues);
        continue;
      }

      if (schema.additionalProperties === false) {
        issues.push(`${path}.${key} is not allowed by schema.`);
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(data) && schema.items) {
    data.forEach((entry, index) => validateNode(entry, schema.items, `${path}[${index}]`, issues));
  }
}

function matchesType(value, expectedType) {
  if (expectedType === 'array') {
    return Array.isArray(value);
  }

  if (expectedType === 'null') {
    return value === null;
  }

  return typeof value === expectedType;
}
