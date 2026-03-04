import { ensureIcon } from './runtime/icon-system.js';

const ACTION_ICON_MATCHERS = [
  { icon: 'play', test: /run|execute|convert|format|analy[sz]e|validate/i },
  { icon: 'copy', test: /copy|clipboard/i },
  { icon: 'download', test: /download|export|save/i },
  { icon: 'clear', test: /clear|reset|remove/i }
];


function inferActionIntent(node) {
  const label = `${node.textContent || ''} ${node.getAttribute('aria-label') || ''}`.trim().toLowerCase();
  if (/copy|clipboard/.test(label)) return 'copy';
  if (/download|export|save/.test(label)) return 'download';
  return '';
}
function inferActionIcon(node) {
  const explicit = node.dataset.iconName;
  if (explicit) {
    return explicit;
  }

  const normalized = `${node.textContent || ''} ${node.getAttribute('aria-label') || ''}`.trim();
  const match = ACTION_ICON_MATCHERS.find((entry) => entry.test.test(normalized));
  if (match) {
    return match.icon;
  }

  return node.classList.contains('tool-btn--primary') ? 'play' : null;
}

function setClassIfNeeded(element, className, enabled) {
  if (!element) {
    return;
  }

  const hasClass = element.classList.contains(className);
  if (enabled && !hasClass) {
    element.classList.add(className);
  } else if (!enabled && hasClass) {
    element.classList.remove(className);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.tool-shell-page');
  if (!page) {
    return;
  }

  const runtime = page.querySelector('.tool-shell-page__runtime');
  const inlineMountTrigger = page.querySelector('[data-inline-mount-trigger="true"]');
  const inlineMountHost = page.querySelector('[data-inline-mount-host="true"]');

  if (inlineMountTrigger && inlineMountHost) {
    inlineMountTrigger.addEventListener('click', async () => {
      const runtimeApi = window.ToolNexus?.runtime;
      const toolSlug = runtime?.dataset?.toolSlug;
      if (!runtimeApi?.invokeTool || !toolSlug) {
        return;
      }

      inlineMountTrigger.disabled = true;
      inlineMountTrigger.textContent = 'Launching inline runtime…';

      try {
        await runtimeApi.invokeTool(toolSlug, {
          mountMode: 'inline',
          host: inlineMountHost,
          initialInput: window.ToolNexusConfig?.tool?.exampleInput ?? '',
          contextMetadata: { source: 'tool-shell-demo' }
        });
        inlineMountTrigger.textContent = 'Inline runtime mounted';
      } catch {
        inlineMountTrigger.disabled = false;
        inlineMountTrigger.textContent = 'Open inline runtime demo';
      }
    });
  }

  if (!runtime) {
    return;
  }

  const toastRegion = runtime.querySelector('.tn-runtime-toast-region');

  const showToast = (message, tone = 'success') => {
    if (!message) {
      return;
    }

    if (!toastRegion) {
      return;
    }

    const toast = document.createElement('div');
    toast.className = `tn-runtime-toast tn-runtime-toast--${tone}`;
    toast.textContent = message;
    toastRegion.append(toast);

    window.requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 240);
    }, 1800);
  };

  const syncCommandDockDensity = () => {
    const followup = runtime.querySelector('[data-tool-followup="true"]');
    if (!followup) {
      return;
    }

    const compact = followup.getBoundingClientRect().width < 620;
    followup.classList.toggle('is-compact', compact);
  };

  const acknowledgeAction = (target) => {
    const action = target.closest('button, .tool-btn, [role="button"]');
    if (!action || action.disabled) {
      return;
    }

    const intent = inferActionIntent(action);
    if (!intent) {
      return;
    }

    if (intent === 'copy') {
      showToast('Copied to clipboard.', 'success');
    } else if (intent === 'download') {
      showToast('Download started.', 'success');
    }
  };

  const statusNode = runtime.querySelector('[data-tool-status="true"], .tn-unified-tool-control__status, #resultStatus, .result-indicator');
  if (statusNode) {
    ensureIcon(statusNode, 'runtime');
  }

  const updateActionIcons = () => {
    const interactive = runtime.querySelectorAll('.tool-local-actions button, .tool-local-actions .tool-btn, .tn-unified-tool-control__actions button, .tn-unified-tool-control__actions .tool-btn, [data-tool-followup="true"] button, [data-tool-followup="true"] .tool-btn');
    interactive.forEach((node) => {
      const iconName = inferActionIcon(node);
      if (iconName) {
        ensureIcon(node, iconName);
      }
    });
  };

  let lastNotifiedState = '';
  let loadingIndicatorTimer = 0;
  const clearLoadingIndicatorTimer = () => {
    if (loadingIndicatorTimer) {
      window.clearTimeout(loadingIndicatorTimer);
      loadingIndicatorTimer = 0;
    }
  };

  const scheduleLoadingIndicator = (status, output, isLoading) => {
    clearLoadingIndicatorTimer();
    if (!status || !output) {
      return;
    }

    setClassIfNeeded(status, 'is-loading-visible', false);
    setClassIfNeeded(output, 'is-processing-visible', false);

    if (!isLoading) {
      return;
    }

    loadingIndicatorTimer = window.setTimeout(() => {
      setClassIfNeeded(status, 'is-loading-visible', true);
      setClassIfNeeded(output, 'is-processing-visible', true);
    }, 140);
  };

  const syncStatusTone = () => {
    const status = runtime.querySelector('[data-tool-status="true"], .tn-unified-tool-control__status, #resultStatus, .result-indicator');
    if (!status) {
      return;
    }

    setClassIfNeeded(status, 'is-running', false);
    setClassIfNeeded(status, 'is-validating', false);
    setClassIfNeeded(status, 'is-streaming', false);

    const state = (status.dataset.executionState || status.dataset.runtimeState || '').toLowerCase();
    const isLoading = state === 'running' || state === 'validating' || state === 'streaming';
    if (isLoading) {
      setClassIfNeeded(status, `is-${state}`, true);
    }

    if (state === 'success') {
      ensureIcon(status, 'success');
      if (lastNotifiedState !== state) {
        showToast('Execution completed.', 'success');
      }
    } else if (state === 'warning' || state === 'uncertain') {
      ensureIcon(status, 'warning');
    } else if (state === 'failed' || state === 'error') {
      ensureIcon(status, 'error');
      if (lastNotifiedState !== state) {
        showToast('Execution failed. Review guidance.', 'error');
      }
    }
    lastNotifiedState = state;

    const output = runtime.querySelector('.tn-unified-tool-control__output');
    if (output) {
      setClassIfNeeded(output, 'is-processing', isLoading);
    }

    scheduleLoadingIndicator(status, output, isLoading);
  };

  const monitorExecutionSuccess = () => {
    const resultStatus = runtime.querySelector('#resultStatus, .result-indicator, .tn-unified-tool-control__status');
    if (!resultStatus) {
      return;
    }

    const isSuccessful = resultStatus.classList.contains('result-indicator--success')
      || /updated|completed|success|ready/i.test(resultStatus.textContent || '');

    if (isSuccessful) {
      setClassIfNeeded(page, 'has-runtime-success', true);
      return;
    }

    setClassIfNeeded(page, 'has-runtime-success', false);
  };

  let isSyncingUI = false;
  let rafScheduled = false;
  const maxMutationsPerFrame = 200;
  const scheduleUiSync = () => {
    if (rafScheduled || isSyncingUI) {
      return;
    }

    rafScheduled = true;
    window.requestAnimationFrame(() => {
      rafScheduled = false;
      if (isSyncingUI) {
        return;
      }

      isSyncingUI = true;
      try {
        updateActionIcons();
        syncStatusTone();
        monitorExecutionSuccess();
      } finally {
        isSyncingUI = false;
      }
    });
  };

  const isInsideMonacoEditor = (target) => {
    if (!target) {
      return false;
    }

    const element = target instanceof Element ? target : target.parentElement;
    return Boolean(element?.closest('.monaco-editor'));
  };

  const observer = new MutationObserver((mutations) => {
    if (!mutations.length) {
      return;
    }

    if (mutations.length > maxMutationsPerFrame) {
      console.warn('[tool-shell-feel] Skipping UI sync due to high mutation volume.', mutations.length);
      return;
    }

    const hasRelevantMutation = mutations.some((mutation) => !isInsideMonacoEditor(mutation.target));
    if (!hasRelevantMutation) {
      return;
    }

    scheduleUiSync();
  });

  runtime.addEventListener('click', (event) => {
    acknowledgeAction(event.target);
  }, true);
  observer.observe(runtime, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: false,
    attributeFilter: ['data-execution-state', 'data-status', 'class']
  });

  updateActionIcons();
  syncStatusTone();
  monitorExecutionSuccess();
  syncCommandDockDensity();

  const resizeObserver = new ResizeObserver(() => syncCommandDockDensity());
  const followupHost = runtime.querySelector('[data-tool-followup="true"]');
  if (followupHost) {
    resizeObserver.observe(followupHost);
  }

  window.addEventListener('beforeunload', () => {
    clearLoadingIndicatorTimer();
    resizeObserver.disconnect();
    observer.disconnect();
  }, { once: true });
});
