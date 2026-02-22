document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.tool-shell-page');
  if (!page) {
    return;
  }

  const cards = Array.from(page.querySelectorAll('[data-actionable-card="true"]'));
  const disclosures = Array.from(page.querySelectorAll('.readme-disclosure'));
  const runtime = page.querySelector('.tool-shell-page__runtime');

  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => card.classList.add('is-emphasized'));
    card.addEventListener('mouseleave', () => card.classList.remove('is-emphasized'));
    card.addEventListener('focus', () => card.classList.add('is-emphasized'));
    card.addEventListener('blur', () => card.classList.remove('is-emphasized'));
  });

  disclosures.forEach((disclosure) => {
    disclosure.addEventListener('toggle', () => {
      disclosure.classList.add('is-transitioning');
      window.setTimeout(() => disclosure.classList.remove('is-transitioning'), 180);
    });
  });

  if (!runtime) {
    return;
  }

  let pointerGuidanceTimeoutId = 0;
  let pendingFrame = 0;
  let nextPointerX = 0;

  const applyPointerCue = () => {
    pendingFrame = 0;
    const bounds = runtime.getBoundingClientRect();
    const normalized = (nextPointerX - bounds.left) / Math.max(bounds.width, 1);
    runtime.style.setProperty('--runtime-pointer-x', `${Math.min(Math.max(normalized, 0), 1).toFixed(3)}`);
    page.classList.add('has-pointer-guidance');
  };

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
