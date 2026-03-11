const tableBody = document.querySelector('#marketplace-table tbody');
  const applyButton = document.querySelector('#apply-filters');
  const lastSynced = document.querySelector('#marketplace-last-synced');

  async function load() {
    const params = new URLSearchParams({ limit: '200' });
    const toolId = document.querySelector('#tool-filter').value.trim();
    const status = document.querySelector('#status-filter').value;
    const syncedAfter = document.querySelector('#synced-after').value;

    if (toolId) params.append('toolId', toolId);
    if (status) params.append('status', status);
    if (syncedAfter) params.append('syncedAfterUtc', new Date(syncedAfter).toISOString());

    const response = await fetch(`/api/admin/capabilities/marketplace?${params.toString()}`);
    if (!response.ok) {
      tableBody.innerHTML = '<tr><td colspan="6">Failed to load capability registry.</td></tr>';
      lastSynced.textContent = '';
      return;
    }

    const dashboard = await response.json();
    lastSynced.textContent = `Last synced (UTC): ${dashboard.lastSyncedUtc}`;
    tableBody.innerHTML = '';

    if (!dashboard.items || dashboard.items.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No capability records found.</td></tr>';
      return;
    }

    for (const item of dashboard.items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.capabilityId}</td><td>${item.toolId}</td><td>${item.status}</td><td>${item.governance.authority}</td><td>${item.runtimeLanguage}</td><td>${item.governance.snapshotId}</td>`;
      tableBody.appendChild(tr);
    }
  }

  applyButton.addEventListener('click', load);
  await load();
