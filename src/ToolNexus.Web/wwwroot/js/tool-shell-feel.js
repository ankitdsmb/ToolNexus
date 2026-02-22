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

  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => card.classList.add('is-emphasized'));
    card.addEventListener('mouseleave', () => card.classList.remove('is-emphasized'));
    card.addEventListener('focus', () => card.classList.add('is-emphasized'));
    card.addEventListener('blur', () => card.classList.remove('is-emphasized'));
  });

  disclosures.forEach((disclosure) => {
    disclosure.addEventListener('toggle', () => {
      disclosure.classList.add('is-transitioning');
      window.setTimeout(() => disclosure.classList.remove('is-transitioning'), 220);
    });
  });

  if (!runtime) {
    return;
  }

  const signalMomentum = () => {
    if (!momentumLoop) {
      return;
    }

    momentumLoop.hidden = false;
    momentumLoop.classList.remove('is-active');
    window.requestAnimationFrame(() => momentumLoop.classList.add('is-active'));
  };

  const monitorExecutionSuccess = () => {
    const statusNode = runtime.querySelector('#resultStatus, .result-indicator');
    if (!statusNode) {
      return;
    }

    const isSuccessful = statusNode.classList.contains('result-indicator--success')
      || /updated|completed|success|ready/i.test(statusNode.textContent || '');

    if (isSuccessful) {
      page.classList.add('has-runtime-success');
      signalMomentum();
      return;
    }

    page.classList.remove('has-runtime-success');
  };

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(monitorExecutionSuccess);
  });

  observer.observe(runtime, { childList: true, subtree: true, attributes: true, characterData: true });
  monitorExecutionSuccess();


  let pointerGuidanceTimeoutId = 0;
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
    window.clearTimeout(pointerGuidanceTimeoutId);
    pointerGuidanceTimeoutId = window.setTimeout(() => {
      page.classList.remove('has-pointer-guidance');
      runtime.style.setProperty('--runtime-pointer-x', '0.5');
      if (runtimeShell) {
        runtimeShell.style.setProperty('--runtime-pointer-x', '0.5');
      }
    }, 140);
  });

  runtime.addEventListener('pointermove', (event) => {
    nextPointerX = event.clientX;
    if (!pendingFrame) {
      pendingFrame = window.requestAnimationFrame(applyPointerCue);
    }

    window.clearTimeout(pointerGuidanceTimeoutId);
    pointerGuidanceTimeoutId = window.setTimeout(() => {
      page.classList.remove('has-pointer-guidance');
    }, 900);
  });
});
