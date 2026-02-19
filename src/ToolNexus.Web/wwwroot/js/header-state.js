const header = document.querySelector('.topbar');

if (header) {
  const syncScrolledState = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };

  syncScrolledState();
  window.addEventListener('scroll', syncScrolledState, { passive: true });
}
