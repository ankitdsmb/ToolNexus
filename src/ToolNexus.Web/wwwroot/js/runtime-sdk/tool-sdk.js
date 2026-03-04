import { getToolPlatformKernel } from '../tools/tool-platform-kernel.js';
import { defineTool } from './tool-definition.js';
import { createExecutionContext } from './tool-execution-context.js';
import {
  copyToClipboard,
  detectContentType,
  downloadFile,
  formatResult
} from './tool-utils.js';

const toolRegistry = new Map();

function normalizeError(error, toolId = 'unknown-tool') {
  if (error instanceof Error) {
    return error;
  }

  return new Error(`[${toolId}] ${String(error ?? 'Unknown tool execution failure')}`);
}

export function registerTool(tool, options = {}) {
  const normalizedTool = tool?.onRun ? tool : defineTool(tool);
  const existing = toolRegistry.get(normalizedTool.id);

  if (existing) {
    return existing;
  }

  const registration = {
    ...normalizedTool,
    root: options.root ?? null,
    mounted: false,
    context: null,
    kernelHandle: null
  };

  if (registration.root) {
    registration.kernelHandle = getToolPlatformKernel().registerTool({
      id: registration.id,
      root: registration.root,
      init: (root) => {
        registration.context = createExecutionContext({ tool: registration, root });
        Promise.resolve(registration.onLoad(registration.context)).catch((error) => {
          console.warn(`runtime-sdk: onLoad failed for "${registration.id}"`, error);
        });
        return registration.context;
      },
      destroy: (context) => {
        Promise.resolve(registration.onUnload(context ?? registration.context)).catch((error) => {
          console.warn(`runtime-sdk: onUnload failed for "${registration.id}"`, error);
        });
      }
    });

    registration.kernelHandle.init();
    registration.mounted = true;
  }

  toolRegistry.set(registration.id, registration);
  return registration;
}

export function getRegisteredTool(id) {
  return toolRegistry.get(id) ?? null;
}

export function listRegisteredTools() {
  return Array.from(toolRegistry.values());
}

export async function executeTool(toolOrId, options = {}) {
  const registration = typeof toolOrId === 'string' ? getRegisteredTool(toolOrId) : registerTool(toolOrId, options);

  if (!registration) {
    throw new Error(`runtime-sdk: Unknown tool "${String(toolOrId)}".`);
  }

  const context = options.context
    ?? registration.context
    ?? createExecutionContext({ tool: registration, root: options.root ?? registration.root });

  const input = options.input ?? context.getInput();

  try {
    await registration.onActivate(context);
    context.setStatus('running');

    const result = await registration.onRun(input, context);
    context.setOutput(result);
    context.setStatus('success');

    return result;
  } catch (rawError) {
    const error = normalizeError(rawError, registration.id);
    context.setStatus('error');
    context.setOutput(error.message);
    throw error;
  } finally {
    await registration.onSuspend(context);
  }
}

export function unregisterTool(id) {
  const registration = toolRegistry.get(id);

  if (!registration) {
    return false;
  }

  if (registration.kernelHandle) {
    registration.kernelHandle.destroy();
  }

  toolRegistry.delete(id);
  return true;
}

export {
  copyToClipboard,
  createExecutionContext,
  defineTool,
  detectContentType,
  downloadFile,
  formatResult
};
