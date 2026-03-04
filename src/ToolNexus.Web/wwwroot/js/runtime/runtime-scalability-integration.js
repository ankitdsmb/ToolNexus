import { loadToolIndex, resolveTool } from './tool-index-service.js';
import { validateToolCertification } from './tool-certification-policy.js';
import { loadToolModule } from './tool-module-loader.js';
import { activateTool } from './tool-state-machine.js';
import { shouldEmitEvent } from './telemetry-sampler.js';

export async function runToolWithScalableInfrastructure(toolId, options = {}) {
  const startedAt = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();

  await loadToolIndex();

  const descriptor = resolveTool(toolId);
  if (!descriptor) {
    throw new Error(`[RuntimeScalability] Unknown tool: ${toolId}`);
  }

  const certification = validateToolCertification(toolId, {
    runtimeAbi: options.runtimeAbi,
    allowedTiers: options.allowedCertificationTiers
  });
  if (!certification.valid) {
    throw new Error(`[RuntimeScalability] Certification rejected for "${toolId}": ${certification.reason}`);
  }

  const module = await loadToolModule(toolId, {
    runtimeAbi: options.runtimeAbi,
    allowedCertificationTiers: options.allowedCertificationTiers,
    priority: options.interactive ? 100 : descriptor.warmupPriority
  });

  activateTool(toolId);

  const mountResult = await options.mountLifecycle?.({ toolId, descriptor, module });
  const executionResult = await options.execute?.({ toolId, descriptor, module, mountResult });

  const finishedAt = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();
  const durationMs = Math.max(0, finishedAt - startedAt);

  const emitTelemetry = shouldEmitEvent('tool_execution_success', {
    strategy: options.telemetryStrategy,
    durationMs
  });

  return {
    descriptor,
    module,
    mountResult,
    executionResult,
    telemetry: {
      emit: emitTelemetry,
      durationMs
    }
  };
}
