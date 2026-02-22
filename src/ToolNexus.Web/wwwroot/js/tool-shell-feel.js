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
      if (disclosure.open) {
        disclosure.dataset.lastOpenedAt = String(Date.now());
      }
    });
  });

  runtime?.addEventListener('pointermove', () => {
    page.classList.add('has-pointer-guidance');
    window.clearTimeout(runtime.__pointerGuidanceTimeout);
    runtime.__pointerGuidanceTimeout = window.setTimeout(() => {
      page.classList.remove('has-pointer-guidance');
    }, 900);
  });
});
