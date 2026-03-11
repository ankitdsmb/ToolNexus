document.addEventListener('click', (event) => {
  const toggle = event.target.closest?.('[data-tool-fullscreen-toggle="true"]');
  if (!toggle) return;

  const shell = document.querySelector('.tool-shell-page[data-runtime-layout="modern"]');
  if (!shell) return;

  const expanded = shell.classList.toggle('tool-shell-page--fullscreen');
  toggle.setAttribute('aria-pressed', expanded ? 'true' : 'false');
  toggle.textContent = expanded ? 'Exit fullscreen' : 'Expand workspace';
});
