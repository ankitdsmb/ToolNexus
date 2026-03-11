const layout = document.querySelector('[data-docs-layout]');
const toggle = document.querySelector('[data-docs-menu-toggle]');

if (layout && toggle) {
  toggle.addEventListener('click', () => {
    const isOpen = layout.classList.toggle('is-sidebar-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}
