const searchInput = document.getElementById('execution-search');
const refreshButton = document.getElementById('refresh-executions');
const tbody = document.querySelector('#executions-table tbody');

if (tbody) {
  const res = await fetch('/api/admin/executions?page=1&pageSize=50');
  if (res.ok) {
    const data = await res.json();
    const fragment = document.createDocumentFragment();

    (data.items || []).forEach((item) => {
      const tr = document.createElement('tr');
      tr.dataset.executed = item.executedAtUtc || '';
      tr.dataset.tool = item.toolId || '';
      tr.dataset.authority = item.authority || '';

      const values = [
        item.executedAtUtc,
        item.toolId,
        item.authority,
        `${item.conformanceStatus} (${item.conformanceIssueCount})`,
        item.traceId ?? '-'
      ];

      values.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      });

      const detailCell = document.createElement('td');
      const detailLink = document.createElement('a');
      detailLink.className = 'btn btn-sm btn-outline-primary';
      detailLink.href = `/admin/executions/${item.id}`;
      detailLink.textContent = 'Details';
      detailCell.append(detailLink);
      tr.append(detailCell);

      fragment.append(tr);
    });

    tbody.replaceChildren(fragment);
  }
}

searchInput?.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  document.querySelectorAll('#executions-table tbody tr').forEach((row) => {
    const blob = `${row.dataset.tool || ''} ${row.dataset.authority || ''}`.toLowerCase();
    row.hidden = q.length > 0 && !blob.includes(q);
  });
});

refreshButton?.addEventListener('click', () => window.location.reload());
