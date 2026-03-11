let currentPage = 1;
    let totalItems = 0;
    const pageSize = 20;

    const params = new URLSearchParams(window.location.search);
    const now = new Date();
    const endDefault = now.toISOString().slice(0, 10);
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 13);
    const startDefault = startDate.toISOString().slice(0, 10);

    const filterTool = document.getElementById('filter-tool');
    const panelToolDetail = document.getElementById('panel-tool-detail');
    const filterStart = document.getElementById('filter-start');
    const filterEnd = document.getElementById('filter-end');

    filterTool.value = params.get('toolSlug') || '';
    filterStart.value = params.get('startDate') || startDefault;
    filterEnd.value = params.get('endDate') || endDefault;

    const renderRows = (selector, rows) => {
        const body = document.querySelector(selector + ' tbody');
        body.innerHTML = '';
        rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><a href="?toolSlug=${encodeURIComponent(row.toolSlug)}&startDate=${filterStart.value}&endDate=${filterEnd.value}">${row.toolSlug}</a></td><td class="text-end">${row.totalExecutions}</td><td class="text-end">${row.successRate.toFixed(1)}%</td><td class="text-end">${row.avgDurationMs.toFixed(1)}</td>`;
            body.appendChild(tr);
        });
    };

    async function loadDashboard(){
        const response = await fetch('/api/admin/analytics/dashboard');
        if (!response.ok) return;
        const dashboard = await response.json();

        document.getElementById('metric-total').textContent = dashboard.totalExecutionsToday.toLocaleString();
        document.getElementById('metric-success').textContent = `${dashboard.successRate.toFixed(1)}%`;
        document.getElementById('metric-duration').textContent = `${dashboard.avgDurationMs.toFixed(1)} ms`;
        document.getElementById('metric-active').textContent = dashboard.activeToolsCount.toString();

        renderRows('#top-tools-table', dashboard.topTools || []);
        renderRows('#slow-tools-table', dashboard.slowTools || []);
    }


    async function loadToolDetail(toolSlug){
        if (!toolSlug) return;
        const search = new URLSearchParams({
            toolSlug,
            startDate: filterStart.value,
            endDate: filterEnd.value
        });

        const response = await fetch(`/api/admin/analytics/tool-detail?${search.toString()}`);
        if (!response.ok) return;

        const detail = await response.json();
        const summary = document.getElementById('tool-detail-summary');
        summary.classList.remove('d-none');
        document.getElementById('tool-detail-range').textContent = `${detail.toolSlug} · ${detail.startDate} → ${detail.endDate}`;
        document.getElementById('tool-detail-executions').textContent = detail.totalExecutions.toLocaleString();
        document.getElementById('tool-detail-failures').textContent = detail.totalFailures.toLocaleString();
        document.getElementById('tool-detail-success').textContent = `${detail.successRate.toFixed(1)}%`;
        document.getElementById('tool-detail-duration').textContent = `${detail.avgDurationMs.toFixed(1)} ms`;

        const body = document.querySelector('#tool-detail-table tbody');
        body.innerHTML = '';
        (detail.dailyRows || []).forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${row.date}</td><td class="text-end">${row.totalExecutions}</td><td class="text-end">${row.failureCount}</td><td class="text-end">${row.successRate.toFixed(1)}%</td><td class="text-end">${row.avgDurationMs.toFixed(1)}</td>`;
            body.appendChild(tr);
        });

        if (!body.children.length) {
            body.innerHTML = '<tr><td colspan="5" class="text-secondary">No rows found for this tool in selected range.</td></tr>';
        }

        panelToolDetail?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function loadDrilldown(){
        const search = new URLSearchParams({
            startDate: filterStart.value,
            endDate: filterEnd.value,
            page: String(currentPage),
            pageSize: String(pageSize)
        });

        if (filterTool.value.trim()) search.set('toolSlug', filterTool.value.trim());

        history.replaceState({}, '', `${window.location.pathname}?${search.toString()}`);

        const response = await fetch(`/api/admin/analytics/drilldown?${search.toString()}`);
        if (!response.ok) return;
        const payload = await response.json();
        const body = document.querySelector('#drilldown-table tbody');
        body.innerHTML = '';

        (payload.items || []).forEach(item => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-tool-slug', item.toolSlug);
            tr.innerHTML = `<td>${item.date}</td><td><button class="btn btn-link btn-sm p-0 analytics-tool-detail-jump" data-tool-slug="${item.toolSlug}">${item.toolSlug}</button></td><td class="text-end">${item.totalExecutions}</td><td class="text-end">${item.failureCount}</td><td class="text-end">${item.successRate.toFixed(1)}%</td><td class="text-end">${item.avgDurationMs.toFixed(1)}</td>`;
            body.appendChild(tr);
        });

        totalItems = payload.totalItems || 0;
        document.getElementById('drilldown-count').textContent = `${totalItems} rows`;
        document.getElementById('drilldown-page-label').textContent = `Page ${currentPage}`;
        document.getElementById('drilldown-prev').disabled = currentPage <= 1;
        document.getElementById('drilldown-next').disabled = currentPage * pageSize >= totalItems;

        body.querySelectorAll('.analytics-tool-detail-jump').forEach(button => {
            button.addEventListener('click', async () => {
                const slug = button.getAttribute('data-tool-slug') || '';
                filterTool.value = slug;
                await loadToolDetail(slug);
            });
        });
    }

    document.getElementById('apply-filters').addEventListener('click', async () => { currentPage = 1; await loadDrilldown(); });
    document.getElementById('clear-filters').addEventListener('click', async () => {
        filterTool.value = '';
        filterStart.value = startDefault;
        filterEnd.value = endDefault;
        currentPage = 1;
        await loadDrilldown();
    });

    document.getElementById('drilldown-prev').addEventListener('click', async () => { if (currentPage > 1) { currentPage -= 1; await loadDrilldown(); } });
    document.getElementById('drilldown-next').addEventListener('click', async () => { if (currentPage * pageSize < totalItems) { currentPage += 1; await loadDrilldown(); } });

    document.querySelectorAll('.analytics-nav-card').forEach(card => {
        card.addEventListener('click', () => {
            const target = card.dataset.drill;
            const panel = document.getElementById(`panel-${target}`) || document.getElementById('panel-drilldown');
            panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    document.querySelectorAll('#top-tools-table, #slow-tools-table').forEach(table => {
        table.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLAnchorElement)) return;
            const slug = target.textContent?.trim();
            if (!slug) return;
            event.preventDefault();
            filterTool.value = slug;
            await loadToolDetail(slug);
        });
    });

    const jump = params.get('drilldown');
    if (jump) {
        requestAnimationFrame(() => {
            const panel = document.getElementById(`panel-${jump}`) || document.getElementById('panel-drilldown');
            panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    await loadDashboard();
    await loadDrilldown();
    if (filterTool.value.trim()) {
        await loadToolDetail(filterTool.value.trim());
    }
