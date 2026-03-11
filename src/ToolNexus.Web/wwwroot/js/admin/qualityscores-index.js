const latestBody = document.querySelector('#latest-quality-table tbody');
  const eventsBody = document.querySelector('#quality-events-table tbody');
  const applyButton = document.querySelector('#apply-filters');

  function renderRows(body, rows) {
    body.innerHTML = '';

    if (!rows || rows.length === 0) {
      body.innerHTML = '<tr><td colspan="6">No quality scores found.</td></tr>';
      return;
    }

    for (const item of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.toolId}</td><td>${item.score}</td><td>${item.architectureScore}</td><td>${item.testCoverageScore}</td><td>${item.craftScore}</td><td>${item.timestampUtc}</td>`;
      body.appendChild(tr);
    }
  }

  async function load() {
    const params = new URLSearchParams({ limit: '100' });
    const toolId = document.querySelector('#tool-filter').value.trim();
    const startDate = document.querySelector('#start-date').value;
    const endDate = document.querySelector('#end-date').value;

    if (toolId) params.append('toolId', toolId);
    if (startDate) params.append('startDateUtc', new Date(startDate).toISOString());
    if (endDate) params.append('endDateUtc', new Date(endDate + 'T23:59:59Z').toISOString());

    const response = await fetch(`/api/admin/governance/quality-scores?${params.toString()}`);
    if (!response.ok) {
      latestBody.innerHTML = '<tr><td colspan="6">Failed to load quality scores.</td></tr>';
      eventsBody.innerHTML = '<tr><td colspan="6">Failed to load quality scores.</td></tr>';
      return;
    }

    const dashboard = await response.json();
    renderRows(latestBody, dashboard.latestByTool);
    renderRows(eventsBody, dashboard.items);
  }

  applyButton.addEventListener('click', load);
  await load();
