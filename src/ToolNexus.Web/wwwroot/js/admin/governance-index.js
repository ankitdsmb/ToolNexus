const tableBody = document.querySelector('#governance-decisions-table tbody');
  const applyButton = document.querySelector('#apply-filters');
  const inlineApplyButton = document.querySelector('#apply-filters-inline');

  async function load() {
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
    const toolId = (document.querySelector('#tool-filter')?.value || document.querySelector('#tool-filter-inline')?.value || '').trim();
    const policyVersion = document.querySelector('#policy-filter').value.trim();
    const startDate = document.querySelector('#start-date').value;
    const endDate = document.querySelector('#end-date').value;

    if (toolId) params.append('toolId', toolId);
    if (policyVersion) params.append('policyVersion', policyVersion);
    if (startDate) params.append('startDateUtc', new Date(startDate).toISOString());
    if (endDate) params.append('endDateUtc', new Date(endDate + 'T23:59:59Z').toISOString());

    const response = await fetch(`/api/admin/governance/decisions?${params.toString()}`);
    if (!response.ok) {
      tableBody.innerHTML = '<tr><td colspan="8">Failed to load decisions.</td></tr>';
      return;
    }

    const page = await response.json();
    tableBody.innerHTML = '';

    if (!page.items || page.items.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8">No decisions found.</td></tr>';
      return;
    }

    for (const item of page.items) {
      const tr = document.createElement('tr');
      tr.dataset.timestamp = item.timestampUtc || '';
      tr.dataset.tool = item.toolId || '';
      tr.dataset.capability = item.capabilityId || '';
      tr.innerHTML = `<td>${item.timestampUtc}</td><td>${item.toolId}</td><td>${item.capabilityId}</td><td>${item.policyVersion}</td><td>${item.status}</td><td>${item.authority}</td><td>${item.approvedBy}</td><td>${item.decisionReason}</td>`;
      tableBody.appendChild(tr);
    }
  }

  applyButton?.addEventListener('click', load);
  inlineApplyButton?.addEventListener('click', load);
  await load();
