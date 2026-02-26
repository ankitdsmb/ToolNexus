const telemetryEvent = 'admin.action.executed';

function wireAuditBanner() {
  window.addEventListener('admin:mutation-complete', (event) => {
    const detail = event.detail || {};
    const banner = document.getElementById('admin-audit-banner');
    if (!banner) return;

    const auditId = banner.querySelector('[data-admin-audit-id]');
    const correlationId = banner.querySelector('[data-admin-correlation-id]');
    if (auditId) auditId.textContent = detail.auditId || 'not-provided';
    if (correlationId) correlationId.textContent = detail.correlationId || 'not-provided';

    banner.classList.remove('d-none');
    window.dispatchEvent(new CustomEvent('admin:telemetry', {
      detail: {
        eventName: telemetryEvent,
        payload: {
          domain: detail.domain || 'admin',
          correlationId: detail.correlationId || null,
          operatorId: detail.operatorId || null,
          authority: detail.authority || 'server-governed'
        }
      }
    }));
  });
}

function wireActionBar() {
  const map = [
    ['[data-admin-action-left]', '[data-admin-primary-actions]'],
    ['[data-admin-action-center]', '[data-admin-bulk-actions]'],
    ['[data-admin-action-right]', '[data-admin-filters]']
  ];

  for (const [slotSelector, sourceSelector] of map) {
    const slot = document.querySelector(slotSelector);
    const source = document.querySelector(sourceSelector);
    if (!slot || !source) continue;
    slot.replaceChildren(source);
    source.classList.remove('d-none');
  }
}

function wireUnifiedDataTable() {
  document.querySelectorAll('[data-admin-data-table]').forEach(table => {
    table.querySelectorAll('th[data-sortable-key]').forEach(header => {
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        const key = header.dataset.sortableKey;
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const current = header.dataset.sortDirection === 'asc' ? 'desc' : 'asc';
        header.dataset.sortDirection = current;
        rows.sort((a, b) => {
          const aValue = (a.dataset[key] || '').toLowerCase();
          const bValue = (b.dataset[key] || '').toLowerCase();
          return current === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        });
        rows.forEach(row => table.querySelector('tbody')?.appendChild(row));
      });
    });
  });
}

wireAuditBanner();
wireActionBar();
wireUnifiedDataTable();
