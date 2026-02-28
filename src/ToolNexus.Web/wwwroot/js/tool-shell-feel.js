const ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>',
  wand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 9-9"></path><path d="m14.5 4.5 5 5"></path><path d="M11 6 8 3"></path><path d="m16 1 1.5 1.5"></path><path d="M2 12 1 11"></path><path d="M7 17 6 16"></path></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path><path d="M12 15V3"></path></svg>',
  clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 3 0"></path><path d="M8 6h13"></path><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  runtime: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 9h6v6H9z"></path></svg>'
};

const ACTION_ICON_MATCHERS = [
  { icon: 'play', test: /run|execute|convert|format|analy[sz]e|validate/i },
  { icon: 'copy', test: /copy|clipboard/i },
  { icon: 'download', test: /download|export|save/i },
  { icon: 'clear', test: /clear|reset|remove/i }
];

function ensureIcon(target, iconName) {
  if (!target) {
    return;
  }

  const iconMarkup = ICONS[iconName];
  if (!iconMarkup) {
    return;
  }

  const existing = target.querySelector('.tn-icon');
  if (existing?.dataset.iconName === iconName) {
    return;
  }

  if (existing) {
    existing.remove();
  }

  const icon = document.createElement('span');
  icon.className = 'tn-icon';
  icon.dataset.iconName = iconName;
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = iconMarkup;
  target.prepend(icon);
}

function inferActionIcon(node) {
  const explicit = node.dataset.iconName;
  if (explicit && ICONS[explicit]) {
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
    } else if (state === 'warning' || state === 'uncertain') {
      ensureIcon(status, 'warning');
    } else if (state === 'failed' || state === 'error') {
      ensureIcon(status, 'error');
    }

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
