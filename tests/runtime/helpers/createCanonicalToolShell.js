export function createCanonicalToolShellMarkup({
  shellAttributes = '',
  contextHtml = '',
  statusHtml = '',
  followupHtml = '',
  inputHtml = '',
  outputHtml = ''
} = {}) {
  return `
<section data-tool-shell="true"${shellAttributes ? ` ${shellAttributes}` : ''}>
  <section data-tool-context="true">${contextHtml}</section>
  <section data-tool-status="true">${statusHtml}</section>
  <section data-tool-followup="true">${followupHtml}</section>
  <section data-tool-content-host="true">
    <section data-tool-input="true">${inputHtml}</section>
    <section data-tool-output="true">${outputHtml}</section>
  </section>
</section>`;
}

export function createCanonicalToolShell(options = {}) {
  const host = document.createElement('div');
  host.innerHTML = createCanonicalToolShellMarkup(options);
  return host;
}
