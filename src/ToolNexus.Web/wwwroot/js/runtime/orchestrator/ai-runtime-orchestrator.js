import { analyzeToolGenome } from './tool-genome-analyzer.js';
import { predictRuntimeBehavior } from './behavior-prediction-engine.js';
import { evaluateRuntimeGovernance } from './runtime-governance-engine.js';

function resolveOrchestratorMode({ behaviorProfile = {}, governanceProfile = {} } = {}) {
  if (governanceProfile.riskLevel === 'high') {
    return 'passive_stabilize';
  }

  if (behaviorProfile.executionStyle === 'iterative') {
    return 'passive_guided';
  }

  return 'passive_observe';
}

function resolveOrchestratorComplexity({ behaviorProfile = {}, governanceProfile = {}, genomeProfile = {} } = {}) {
  if (governanceProfile.riskLevel === 'high') {
    return 'high';
  }

  if (behaviorProfile.complexityScore >= 5 || genomeProfile.workflowType === 'pipeline') {
    return 'high';
  }

  if (behaviorProfile.complexityScore >= 3 || genomeProfile.workflowType === 'transform') {
    return 'medium';
  }

  return 'low';
}

export function applyAiRuntimeOrchestrator(root, options = {}) {
  const genomeAnalyzer = options.genomeAnalyzer ?? analyzeToolGenome;
  const behaviorPredictor = options.behaviorPredictor ?? predictRuntimeBehavior;
  const governanceEvaluator = options.governanceEvaluator ?? evaluateRuntimeGovernance;

  const genomeProfile = genomeAnalyzer(root, options.genome ?? {});
  const behaviorProfile = behaviorPredictor(genomeProfile, options.behavior ?? {});
  const governanceProfile = governanceEvaluator({ genomeProfile, behaviorProfile }, options.governance ?? {});
  const mode = resolveOrchestratorMode({ behaviorProfile, governanceProfile });
  const complexity = resolveOrchestratorComplexity({ behaviorProfile, governanceProfile, genomeProfile });

  const runtimeProfile = {
    genomeProfile,
    behaviorProfile,
    governanceProfile,
    mode,
    complexity
  };

  if (root && typeof root.setAttribute === 'function') {
    root.setAttribute('data-tool-genome', genomeProfile.genome);
    root.setAttribute('data-orchestrator-mode', mode);
    root.setAttribute('data-orchestrator-complexity', complexity);
    root.__toolNexusRuntimeOrchestratorProfile = runtimeProfile;
  }

  const telemetry = {
    toolSlug: options.toolSlug ?? null,
    mode,
    complexity,
    metadata: {
      genome: genomeProfile,
      behavior: behaviorProfile,
      governance: governanceProfile
    }
  };

  if (typeof options.emitTelemetry === 'function') {
    try {
      options.emitTelemetry('runtime_orchestrator_observation_created', telemetry);
    } catch {
      // best-effort telemetry
    }
  }

  return {
    mode,
    genomeProfile,
    behaviorProfile,
    governanceProfile,
    telemetry,
    complexity,
    runtimeProfile,
    passive: true
  };
}
