const RESPONSE_STATUS = Object.freeze({
  success: 'success',
  error: 'error'
});

const HEAVY_OPERATIONS = Object.freeze(new Set([
  'jsonFormat',
  'cssAnalyze',
  'textTransform',
  'textDiff'
]));

let requestCounter = 0;

export function createWorkerRequest(operation, payload = {}) {
  return {
    id: `worker-task-${++requestCounter}`,
    operation,
    payload,
    sentAt: (typeof performance !== 'undefined' ? performance.now() : Date.now())
  };
}

export function createWorkerSuccessResponse(request, result, startedAt) {
  const completedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    id: request.id,
    status: RESPONSE_STATUS.success,
    operation: request.operation,
    result,
    metrics: {
      durationMs: Number((completedAt - startedAt).toFixed(3))
    }
  };
}

export function createWorkerErrorResponse(request, error, startedAt) {
  const completedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    id: request?.id,
    status: RESPONSE_STATUS.error,
    operation: request?.operation,
    error: {
      message: error?.message || 'Worker execution failed.',
      stack: error?.stack || null
    },
    metrics: {
      durationMs: Number((completedAt - startedAt).toFixed(3))
    }
  };
}

export function isHeavyWorkerOperation(operation) {
  return HEAVY_OPERATIONS.has(operation);
}

export function isWorkerResponseSuccess(response) {
  return response?.status === RESPONSE_STATUS.success;
}
