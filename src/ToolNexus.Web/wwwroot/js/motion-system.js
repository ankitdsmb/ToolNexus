const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function onReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
}

function initPageEntrance() {
  requestAnimationFrame(() => {
    document.body.classList.remove('page-enter');
  });
}

function initRevealAnimations() {
  const nodes = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!nodes.length) return;

  document.documentElement.classList.add('motion-reveal-ready');

  nodes.forEach((node, index) => {
    if (!node.style.getPropertyValue('--reveal-index')) {
      node.style.setProperty('--reveal-index', String(index));
    }
  });

  if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
    document.documentElement.classList.remove('motion-reveal-ready');
    nodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

  nodes.forEach((node) => observer.observe(node));
}

function addRipple(event, element) {
  if (prefersReducedMotion.matches) return;

  const rect = element.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = `${event.clientX - rect.left}px`;
  ripple.style.top = `${event.clientY - rect.top}px`;
  element.appendChild(ripple);

  ripple.addEventListener('animationend', () => {
    ripple.remove();
  }, { once: true });
}

function initRippleEffect() {
  const selectors = [
    'button',
    '.hero-btn',
    '.tool-btn',
    '.theme-toggle',
    '.card',
    '.chip',
    '.trust-link',
    '.hero__scroll'
  ];

  document.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) return;

    const target = event.target.closest(selectors.join(','));
    if (!target) return;

    addRipple(event, target);
  });
}

function initCardTilt() {
  if (prefersReducedMotion.matches) return;

  const cards = Array.from(document.querySelectorAll('.tool-card, .card, .testimonial-card, .trust-stat'));
  if (!cards.length) return;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  cards.forEach((card) => {
    card.style.transformStyle = 'preserve-3d';

    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = clamp((px - 0.5) * 8, -5, 5);
      const rotateX = clamp((0.5 - py) * 8, -5, 5);

      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

function initSmoothAnchors() {
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.length <= 1) return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  });
}

onReady(() => {
  initPageEntrance();
  initRevealAnimations();
  initRippleEffect();
  initCardTilt();
  initSmoothAnchors();
});
