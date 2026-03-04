function encodeBase64(value) {
  const text = String(value ?? '');
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(String(value ?? ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const OPERATION_HANDLERS = Object.freeze({
  urlEncode: (value) => encodeURIComponent(String(value ?? '')),
  urlDecode: (value) => decodeURIComponent(String(value ?? '')),
  base64Encode: (value) => encodeBase64(value),
  base64Decode: (value) => decodeBase64(value),
  jsonFormat: (value) => JSON.stringify(JSON.parse(String(value ?? '{}')), null, 2)
});

export function runSchemaOperations(schema, inputValues = {}) {
  const state = { ...inputValues };
  const defaultInputName = schema.inputs[0]?.name;
  const defaultOutputName = schema.outputs[0]?.name ?? 'result';
  let currentValue = defaultInputName ? state[defaultInputName] : '';

  for (const action of schema.actions) {
    const handler = OPERATION_HANDLERS[action.operation];
    if (typeof handler !== 'function') {
      throw new Error(`Unsupported schema operation "${action.operation}".`);
    }

    const fromName = action.from || defaultInputName;
    const inputValue = fromName ? state[fromName] : currentValue;
    const result = handler(inputValue, { state, action, schema });
    const toName = action.to || defaultOutputName;

    state[toName] = result;
    currentValue = result;
  }

  return state;
}

export function hasSchemaOperation(operationName) {
  return typeof OPERATION_HANDLERS[operationName] === 'function';
}
