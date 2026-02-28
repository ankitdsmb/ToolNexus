import { ensureIcon } from './runtime/icon-system.js';

const ACTION_ICON_MATCHERS = [
  { icon: 'play', test: /run|execute|convert|format|analy[sz]e|validate/i },
  { icon: 'copy', test: /copy|clipboard/i },
  { icon: 'download', test: /download|export|save/i },
  { icon: 'clear', test: /clear|reset|remove/i }
];

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

document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.tool-shell-page');
  if (!page) {
    return;
  }

  const cards = Array.from(page.querySelectorAll('[data-actionable-card="true"]'));
  const disclosures = Array.from(page.querySelectorAll('.readme-disclosure'));
  const runtime = page.querySelector('.tool-shell-page__runtime');
  const runtimeShell = page.querySelector('[data-runtime-zone-shell="true"]');
  const momentumLoop = page.querySelector('[data-momentum-loop="true"]');
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

  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => card.classList.add('is-emphasized'));
    card.addEventListener('mouseleave', () => card.classList.remove('is-emphasized'));
    card.addEventListener('focus', () => card.classList.add('is-emphasized'));
    card.addEventListener('blur', () => card.classList.remove('is-emphasized'));
  });

  disclosures.forEach((disclosure) => {
    disclosure.addEventListener('toggle', () => {
      disclosure.classList.add('is-transitioning');
      window.requestAnimationFrame(() => disclosure.classList.remove('is-transitioning'));
    });
  });

  if (!runtime) {
    return;
  }

  const toastRegion = document.createElement('section');
  toastRegion.className = 'tn-runtime-toast-region';
  toastRegion.setAttribute('aria-live', 'polite');
  toastRegion.setAttribute('aria-label', 'Runtime notifications');
  runtime.append(toastRegion);

  const showToast = (message, tone = 'success') => {
    if (!message) {
      return;
    }

    const toast = document.createElement('div');
    toast.className = `tn-runtime-toast tn-runtime-toast--${tone}`;
    toast.textContent = message;
    toastRegion.append(toast);

    window.requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 180);
    }, 1800);
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
  const syncStatusTone = () => {
    const status = runtime.querySelector('[data-tool-status="true"], .tn-unified-tool-control__status, #resultStatus, .result-indicator');
    if (!status) {
      return;
    }

    status.classList.remove('is-running', 'is-validating', 'is-streaming');

    const state = (status.dataset.executionState || status.dataset.runtimeState || '').toLowerCase();
    if (state === 'running' || state === 'validating' || state === 'streaming') {
      status.classList.add(`is-${state}`);
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
      output.classList.toggle('is-processing', state === 'running' || state === 'streaming');
    }
  };

  const signalMomentum = () => {
    if (!momentumLoop) {
      return;
    }

    momentumLoop.hidden = false;
    momentumLoop.classList.remove('is-active');
    window.requestAnimationFrame(() => momentumLoop.classList.add('is-active'));
  };

  const monitorExecutionSuccess = () => {
    const resultStatus = runtime.querySelector('#resultStatus, .result-indicator, .tn-unified-tool-control__status');
    if (!resultStatus) {
      return;
    }

    const isSuccessful = resultStatus.classList.contains('result-indicator--success')
      || /updated|completed|success|ready/i.test(resultStatus.textContent || '');

    if (isSuccessful) {
      page.classList.add('has-runtime-success');
      signalMomentum();
      return;
    }

    page.classList.remove('has-runtime-success');
  };

  const pulsePrimaryAction = (event) => {
    const button = event.target.closest('.tn-unified-tool-control__run, .tool-btn--primary, .tn-exec-btn--primary');
    if (!button || button.disabled) {
      return;
    }

    button.classList.remove('is-primed');
    window.requestAnimationFrame(() => {
      button.classList.add('is-primed');
      window.setTimeout(() => button.classList.remove('is-primed'), 420);
    });
  };

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => {
      updateActionIcons();
      syncStatusTone();
      monitorExecutionSuccess();
    });
  });

  runtime.addEventListener('click', pulsePrimaryAction, true);
  observer.observe(runtime, { childList: true, subtree: true, attributes: true, characterData: true });

  updateActionIcons();
  syncStatusTone();
  monitorExecutionSuccess();

  let pendingFrame = 0;
  let nextPointerX = 0;

  const applyPointerCue = () => {
    pendingFrame = 0;
    const bounds = runtime.getBoundingClientRect();
    const normalized = (nextPointerX - bounds.left) / Math.max(bounds.width, 1);
    const pointerX = `${Math.min(Math.max(normalized, 0), 1).toFixed(3)}`;
    runtime.style.setProperty('--runtime-pointer-x', pointerX);
    if (runtimeShell) {
      runtimeShell.style.setProperty('--runtime-pointer-x', pointerX);
    }
    page.classList.add('has-pointer-guidance');
  };

  runtime.addEventListener('pointerleave', () => {
    page.classList.remove('has-pointer-guidance');
    runtime.style.setProperty('--runtime-pointer-x', '0.5');
    if (runtimeShell) {
      runtimeShell.style.setProperty('--runtime-pointer-x', '0.5');
    }
  });

  runtime.addEventListener('pointermove', (event) => {
    nextPointerX = event.clientX;
    if (!pendingFrame) {
      pendingFrame = window.requestAnimationFrame(applyPointerCue);
    }
  });
});
