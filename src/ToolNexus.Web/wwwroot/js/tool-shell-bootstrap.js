const parseScriptJson = (id) => {
  const node = document.getElementById(id);
  if (!node) return null;

  try {
    return JSON.parse(node.textContent || '{}');
  } catch {
    return null;
  }
};

const config = parseScriptJson('toolnexus-config');
if (config) {
  window.ToolNexusConfig = config;
}

const logging = parseScriptJson('toolnexus-logging');
if (logging) {
  window.ToolNexusLogging = logging;
}

const runtime = parseScriptJson('toolnexus-runtime');
if (runtime?.correlationId) {
  window.ToolNexus = window.ToolNexus || {};
  window.ToolNexus.correlationId = runtime.correlationId;
}

window.ToolNexusTelemetryEnabled = window.ToolNexusTelemetryEnabled === true;
