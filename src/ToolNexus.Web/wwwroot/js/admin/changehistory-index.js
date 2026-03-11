(() => {
    const params = new URLSearchParams(window.location.search);
    const body = document.getElementById('change-history-body');
    const loadMoreBtn = document.getElementById('load-more-btn');

    document.querySelectorAll('time[datetime]').forEach(t => {
        const iso = t.getAttribute('datetime');
        if (!iso) return;
        const date = new Date(iso);
        t.textContent = date.toLocaleString();
        t.title = date.toISOString();
    });

    body?.addEventListener('click', async (event) => {
        const button = event.target.closest('.js-view-payload');
        if (!button) return;
        const eventId = button.dataset.eventId;
        const detailRow = document.querySelector(`[data-payload-row="${eventId}"]`);
        const content = document.querySelector(`[data-payload-content="${eventId}"]`);
        if (!detailRow || !content) return;

        detailRow.classList.toggle('d-none');
        if (content.dataset.loaded === 'true') return;

        const response = await fetch(`/Admin/ChangeHistory/payload/${eventId}`);
        if (!response.ok) {
            content.textContent = 'Failed to load payload.';
            return;
        }

        const payload = await response.json();
        content.textContent = payload.payloadJson;
        content.dataset.loaded = 'true';
    });

    loadMoreBtn?.addEventListener('click', async () => {
        const page = Number(loadMoreBtn.dataset.nextPage || '0');
        const pageSize = Number(loadMoreBtn.dataset.pageSize || '25');
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        const response = await fetch(`/Admin/ChangeHistory/query?${params.toString()}`);
        if (!response.ok) return;
        const result = await response.json();
        (result.items || []).forEach(item => {
            const severityClass = item.severity === 'critical' ? 'danger' : item.severity === 'warning' ? 'warning' : 'secondary';
            const correlation = item.correlationId || item.requestId;
            const row = document.createElement('tr');
            row.setAttribute('data-event-id', item.id);
            row.innerHTML = `
                <td><time datetime="${item.occurredAtUtc}">${new Date(item.occurredAtUtc).toLocaleString()}</time></td>
                <td>${item.actor}</td>
                <td><div>${item.actionType}</div><small class="text-muted">${item.summaryPreview}</small></td>
                <td><div>${item.entityType}</div><small class="text-muted">${item.entityId}</small></td>
                <td><span class="badge bg-${severityClass}">${item.severity}</span></td>
                <td>${correlation ? `<a href="/Admin/ChangeHistory?correlationId=${encodeURIComponent(correlation)}&pageSize=${pageSize}">${correlation}</a>` : '<span class="text-muted">n/a</span>'}</td>
                <td>
                    ${item.truncationApplied ? '<span class="badge bg-warning text-dark me-1">truncated</span>' : ''}
                    ${item.redactionApplied ? '<span class="badge bg-secondary me-1">redacted</span>' : ''}
                    <button type="button" class="btn btn-sm btn-outline-primary js-view-payload" data-event-id="${item.id}">Expand</button>
                </td>`;
            const detailRow = document.createElement('tr');
            detailRow.className = 'd-none';
            detailRow.setAttribute('data-payload-row', item.id);
            detailRow.innerHTML = `<td colspan="7"><pre class="mb-0 small border rounded p-2 bg-light" style="max-height:280px; overflow:auto;" data-payload-content="${item.id}">Loading…</pre></td>`;
            body.appendChild(row);
            body.appendChild(detailRow);
        });

        if (!result.hasNextPage) {
            loadMoreBtn.remove();
            return;
        }

        loadMoreBtn.dataset.nextPage = String(page + 1);
    });
})();
