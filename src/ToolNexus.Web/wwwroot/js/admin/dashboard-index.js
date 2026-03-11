(() => {
    let incidentPage = 1;
    const incidentPageSize = 12;
    let incidentTotal = 0;

    const severityBadgeClass = (severity) => {
        const normalized = (severity || '').toLowerCase();
        if (normalized === 'critical') return 'bg-red-lt text-red-fg';
        if (normalized === 'warning') return 'bg-yellow-lt text-yellow-fg';
        return 'bg-green-lt text-green-fg';
    };

    const setSeverityBadge = (id, severity) => {
        const element = document.getElementById(id);
        element.className = `badge ${severityBadgeClass(severity)}`;
        element.textContent = severity;
    };

    const getSeverity = (value, warningThreshold, criticalThreshold, invert = false) => {
        if (!invert) {
            if (value >= criticalThreshold) return 'critical';
            if (value >= warningThreshold) return 'warning';
            return 'green';
        }

        if (value <= criticalThreshold) return 'critical';
        if (value <= warningThreshold) return 'warning';
        return 'green';
    };

    const tryParseDate = (value) => {
        const parsed = new Date(value);
        return Number.isNaN(parsed.valueOf()) ? null : parsed;
    };

    const formatUtc = (value) => {
        const parsed = tryParseDate(value);
        return parsed ? parsed.toISOString().replace('T', ' ').slice(0, 19) : value;
    };

    const renderIncidents = (items) => {
        const body = document.getElementById('incident-feed-body');
        body.innerHTML = '';

        if (!items.length) {
            body.innerHTML = '<tr><td colspan="5" class="text-secondary">No incidents in this page window.</td></tr>';
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatUtc(item.occurredAtUtc)}</td>
                <td><span class="badge bg-secondary-lt text-secondary-fg">${item.eventType}</span></td>
                <td><span class="badge ${severityBadgeClass(item.severity)}">${item.severity}</span></td>
                <td>${item.destination}</td>
                <td class="text-truncate" style="max-width: 500px;">${item.summary}</td>`;
            body.appendChild(tr);
        });
    };

    const renderAttentionPanel = (signals) => {
        const panel = document.getElementById('operator-attention-panel');
        const list = document.getElementById('attention-items');
        if (signals.length === 0) {
            panel.classList.add('d-none');
            return;
        }

        panel.classList.remove('d-none');
        list.innerHTML = '';
        signals.forEach(signal => {
            const li = document.createElement('li');
            li.textContent = signal;
            list.appendChild(li);
        });

        const attentionSeverity = signals.length >= 3 ? 'critical' : 'warning';
        panel.className = attentionSeverity === 'critical'
            ? 'alert alert-danger border-danger border-2 mb-3'
            : 'alert alert-warning border-warning border-2 mb-3';
        setSeverityBadge('attention-severity', attentionSeverity);
    };

    const getToolHealthStatus = (healthScore) => {
        if (healthScore < 60) return { label: 'broken', className: 'bg-red-lt text-red-fg' };
        if (healthScore < 85) return { label: 'degraded', className: 'bg-yellow-lt text-yellow-fg' };
        return { label: 'healthy', className: 'bg-green-lt text-green-fg' };
    };

    const renderToolHealth = (items) => {
        const body = document.getElementById('tool-health-body');
        body.innerHTML = '';

        if (!items.length) {
            body.innerHTML = '<tr><td colspan="5" class="text-secondary">No runtime incidents recorded yet.</td></tr>';
            return;
        }

        items.forEach(item => {
            const status = getToolHealthStatus(item.healthScore || 0);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.slug}</td>
                <td><span class="badge ${status.className}">${status.label}</span> <span class="text-secondary">(${item.healthScore})</span></td>
                <td>${(item.incidentCount || 0).toLocaleString()}</td>
                <td>${item.lastIncidentUtc ? formatUtc(item.lastIncidentUtc) : '-'}</td>
                <td class="text-truncate" style="max-width: 440px;">${item.dominantError || '-'}</td>`;
            body.appendChild(tr);
        });
    };

    const mapConcurrencyIncidents = (backgroundHealth) => {
        const trend = backgroundHealth?.concurrency?.conflictTrend || [];
        return trend
            .filter(point => (point.conflicts || 0) > 0)
            .slice(-6)
            .map(point => ({
                occurredAtUtc: point.hourUtc,
                eventType: 'concurrency_conflict',
                severity: (point.conflicts || 0) >= 10 ? 'critical' : 'warning',
                destination: 'admin-write-path',
                summary: `${point.conflicts} conflicts recorded in this hour window.`
            }));
    };

    const loadDashboard = async () => {
        const [healthRes, workersRes, incidentsRes, backgroundRes, toolHealthRes] = await Promise.all([
            fetch('/admin/execution/health'),
            fetch('/admin/execution/workers'),
            fetch(`/admin/execution/incidents?page=${incidentPage}&pageSize=${incidentPageSize}`),
            fetch('/health/background'),
            fetch('/api/admin/runtime/tool-health')
        ]);

        if (!healthRes.ok || !workersRes.ok || !incidentsRes.ok || !backgroundRes.ok || !toolHealthRes.ok) {
            return;
        }

        const health = await healthRes.json();
        const workers = await workersRes.json();
        const incidents = await incidentsRes.json();
        const background = await backgroundRes.json();
        const toolHealth = await toolHealthRes.json();

        const queueBacklog = health.pendingItems || 0;
        const retryCount = health.retryCount || 0;
        const deadLetters = health.deadLetterCount || 0;
        const staleJobs = (health.oldestPendingAgeMinutes || 0) >= 15 ? 1 : 0;
        const staleWorkers = (workers.workers || []).filter(x => x.isStale).length;
        const workerActive = !!background.workerActive;

        document.getElementById('metric-queue-backlog').textContent = queueBacklog.toLocaleString();
        document.getElementById('metric-pending-retries').textContent = retryCount.toLocaleString();
        document.getElementById('metric-stale-jobs').textContent = staleJobs.toString();
        document.getElementById('metric-latest-incidents').textContent = (incidents.totalItems || 0).toLocaleString();

        const queueSeverity = getSeverity(queueBacklog, 25, 100);
        setSeverityBadge('badge-queue-severity', queueSeverity);
        document.getElementById('metric-queue-note').textContent = health.backlogIncreasing
            ? 'Backlog trend increasing in the latest 10m window.'
            : 'Backlog trend stable.';

        const workerSeverity = !workerActive || staleWorkers > 0 ? (staleWorkers > 2 || !workerActive ? 'critical' : 'warning') : 'green';
        setSeverityBadge('badge-worker-severity', workerSeverity);
        document.getElementById('metric-worker-health').textContent = workerActive
            ? `${workers.workers.length - staleWorkers}/${workers.workers.length} healthy`
            : 'offline';
        document.getElementById('metric-worker-note').textContent = `${staleWorkers} stale worker(s)`;

        const deadLetterSeverity = getSeverity(deadLetters, 1, 5);
        setSeverityBadge('badge-dead-letter-severity', deadLetterSeverity);
        document.getElementById('metric-dead-letter').textContent = deadLetters.toLocaleString();

        const auditBacklog = background?.audit?.outboxBacklogDepth || 0;
        const auditDeadLetter = background?.audit?.deadLetterOpenCount || 0;
        const auditSeverity = getSeverity(auditBacklog + auditDeadLetter, 1, 25);
        setSeverityBadge('badge-audit-severity', auditSeverity);
        document.getElementById('metric-audit-health').textContent = auditSeverity === 'green' ? 'healthy' : 'degraded';
        document.getElementById('metric-audit-note').textContent = `Outbox: ${auditBacklog} | Dead letters: ${auditDeadLetter}`;

        const conflicts24h = background?.concurrency?.totalConflictsLast24h || 0;
        document.getElementById('metric-conflicts-24h').textContent = conflicts24h.toLocaleString();

        const attentionSignals = [];
        if (queueBacklog >= 100 || health.backlogIncreasing) attentionSignals.push('Blocked queue pressure detected: backlog is increasing and requires immediate triage.');
        if (!workerActive || staleWorkers > 0) attentionSignals.push('Worker offline/stale signal detected: audit delivery path may be partially degraded.');
        if (deadLetters > 0 || auditDeadLetter > 0) attentionSignals.push('Dead-letter growth is active: operator intervention required for replay or resolution.');
        renderAttentionPanel(attentionSignals);

        const mergedIncidents = (incidents.items || [])
            .map(x => ({ ...x }))
            .concat(mapConcurrencyIncidents(background))
            .sort((a, b) => {
                const left = tryParseDate(a.occurredAtUtc)?.valueOf() || 0;
                const right = tryParseDate(b.occurredAtUtc)?.valueOf() || 0;
                return right - left;
            })
            .slice(0, incidentPageSize);

        renderIncidents(mergedIncidents);
        renderToolHealth(toolHealth || []);

        incidentTotal = incidents.totalItems || 0;
        document.getElementById('incident-page-label').textContent = `Page ${incidentPage}`;
        document.getElementById('incident-prev').disabled = incidentPage <= 1;
        document.getElementById('incident-next').disabled = incidentPage * incidentPageSize >= incidentTotal;
    };

    document.getElementById('incident-prev').addEventListener('click', async () => {
        if (incidentPage <= 1) return;
        incidentPage -= 1;
        await loadDashboard();
    });

    document.getElementById('incident-next').addEventListener('click', async () => {
        if (incidentPage * incidentPageSize >= incidentTotal) return;
        incidentPage += 1;
        await loadDashboard();
    });

    document.querySelectorAll('.drilldown-card').forEach(card => {
        card.addEventListener('click', () => {
            const target = card.getAttribute('data-drilldown') || 'unknown';
            window.location.href = `/admin/analytics?drilldown=${encodeURIComponent(target)}`;
        });
    });

    loadDashboard();
})();
