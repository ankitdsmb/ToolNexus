import { analyzeToolGenome } from './tool-genome-analyzer.js';
import { predictRuntimeBehavior } from './behavior-prediction-engine.js';
import { evaluateRuntimeGovernance } from './runtime-governance-engine.js';
import { applyAdaptiveRuntimeClasses, selectExecutionStrategy } from './execution-strategy-engine.js';
import { applyExecutionDensityAutobalancer } from './execution-density-autobalancer.js';
import { createExecutionVisualBrain } from './execution-visual-brain.js';

function resolveOrchestratorMode({ behaviorProfile = {}, governanceProfile = {}, genomeProfile = {} } = {}) {
  if (governanceProfile.riskLevel === 'high' || genomeProfile.workflowType === 'pipeline') {
    return 'advanced';
  }

  if (behaviorProfile.executionStyle === 'iterative' || genomeProfile.workflowType === 'transform') {
    return 'workspace';
  }

  return 'simple';
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
  const mode = resolveOrchestratorMode({ behaviorProfile, governanceProfile, genomeProfile });
  const complexity = resolveOrchestratorComplexity({ behaviorProfile, governanceProfile, genomeProfile });

  const strategy = selectExecutionStrategy({ ...genomeProfile, mode, complexity });
  const appliedRuntimeClasses = applyAdaptiveRuntimeClasses(root, mode);
  const densityAutobalancer = applyExecutionDensityAutobalancer(root, {
    toolSlug: options.toolSlug ?? null,
    emitTelemetry: options.emitTelemetry
  });
  const visualBrain = createExecutionVisualBrain(root, {
    toolSlug: options.toolSlug ?? null,
    emitTelemetry: options.emitTelemetry
  });

  const runtimeProfile = {
    genomeProfile,
    behaviorProfile,
    governanceProfile,
    mode,
    complexity,
    strategy,
    appliedRuntimeClasses,
    densityAutobalancer,
    visualBrain
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
      governance: governanceProfile,
      strategy,
      appliedRuntimeClasses,
      densityAutobalancer,
      visualBrainState: visualBrain.state
    }
  };

  if (typeof options.emitTelemetry === 'function') {
    try {
      options.emitTelemetry('runtime_orchestrator_observation_created', telemetry);
      options.emitTelemetry('runtime_strategy_selected', {
        toolSlug: options.toolSlug ?? null,
        genome: genomeProfile.genome,
        mode,
        complexity,
        strategy,
        appliedRuntimeClasses,
        densityAutobalancer,
        visualBrainState: visualBrain.state
      });
    } catch {
      // best-effort telemetry
    }
  }

  console.info('EXECUTION VISUAL BRAIN ACTIVE\n');

  return {
    mode,
    genomeProfile,
    behaviorProfile,
    governanceProfile,
    telemetry,
    complexity,
    strategy,
    appliedRuntimeClasses,
    runtimeProfile,
    visualBrain,
    passive: true
  };
}
