import { profileExecutionContext } from './execution-context-profiler.js';
import { resolveExecutionMode } from './execution-mode-resolver.js';

export function applyExecutionIntelligence(root, options = {}) {
  if (!root || typeof root.setAttribute !== 'function') {
    return {
      mode: 'balanced',
      profile: profileExecutionContext(null),
      applied: false
    };
  }

  const profile = profileExecutionContext(root, options.profiler ?? {});
  const mode = resolveExecutionMode(profile, options.resolver ?? {});

  root.setAttribute('data-execution-mode', mode);

  const payload = {
    toolSlug: options.toolSlug ?? null,
    mode,
    metadata: {
      editorCount: profile.editorCount,
      actionCount: profile.actionCount,
      complexityScore: profile.complexityScore,
      widgetType: profile.widgetType,
      estimatedPayloadSize: profile.estimatedPayloadSize,
      isEditingIntensive: profile.isEditingIntensive
    }
  };

  if (typeof options.emitTelemetry === 'function') {
    try {
      options.emitTelemetry('execution_intelligence_mode_selected', payload);
    } catch {
      // best-effort telemetry
    }
  }

  return {
    mode,
    profile,
    applied: true,
    telemetry: payload
  };
}
