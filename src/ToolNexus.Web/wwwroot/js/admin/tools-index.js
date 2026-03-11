(() => {
    const pane = document.getElementById('tab-content');
    const form = document.getElementById('tool-editor-form');
    const editorDraftKey = `admin-tool-editor-draft-${document.getElementById('Form_Id')?.value ?? 'new'}`;

    const toolsTable = document.getElementById('tools-table');
    const bulkStatusForm = document.getElementById('bulk-status-form');
    const bulkEnabledInput = document.getElementById('bulk-enabled-input');
    const selectionCount = document.getElementById('bulk-selection-count');
    const filterInput = document.getElementById('tool-filter');

    function selectedBoxes() {
        return Array.from(document.querySelectorAll('.tool-select:checked'));
    }

    function syncSelectionCount() {
        if (selectionCount) {
            selectionCount.textContent = `${selectedBoxes().length} selected`;
        }
    }

    function syncBulkInputs() {
        if (!bulkStatusForm) return;
        bulkStatusForm.querySelectorAll('input[name="toolIds"]').forEach(x => x.remove());
        selectedBoxes().forEach(box => {
            const hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.name = 'toolIds';
            hidden.value = box.value;
            bulkStatusForm.appendChild(hidden);
        });
        syncSelectionCount();
    }

    document.getElementById('select-all-tools')?.addEventListener('change', (event) => {
        const checked = !!event.target.checked;
        document.querySelectorAll('[data-tool-row]:not([hidden]) .tool-select').forEach(box => box.checked = checked);
        syncBulkInputs();
    });

    document.querySelectorAll('.tool-select').forEach(box => box.addEventListener('change', syncBulkInputs));

    document.getElementById('select-visible')?.addEventListener('click', () => {
        document.querySelectorAll('[data-tool-row]:not([hidden]) .tool-select').forEach(box => box.checked = true);
        syncBulkInputs();
    });

    document.getElementById('clear-selected')?.addEventListener('click', () => {
        document.querySelectorAll('.tool-select').forEach(box => box.checked = false);
        syncBulkInputs();
    });

    document.querySelectorAll('[data-bulk-action]').forEach(button => {
        button.addEventListener('click', () => {
            const count = selectedBoxes().length;
            if (!count) {
                alert('Select at least one tool first.');
                return;
            }

            const action = button.getAttribute('data-bulk-action');
            const enabled = action === 'enable';
            const confirmation = window.confirm(`Confirm ${enabled ? 'enable' : 'disable'} for ${count} tool(s)?`);
            if (!confirmation) return;

            bulkEnabledInput.value = enabled ? 'true' : 'false';
            syncBulkInputs();
            bulkStatusForm.submit();
            window.dispatchEvent(new CustomEvent('admin:mutation-complete', { detail: { domain: 'tools', authority: 'admin-ui' } }));
        });
    });

    document.querySelectorAll('[data-single-toggle-form]').forEach(formEl => {
        formEl.addEventListener('submit', (event) => {
            if (!window.confirm('Confirm status change for this tool?')) {
                event.preventDefault();
                return;
            }

            window.dispatchEvent(new CustomEvent('admin:mutation-complete', { detail: { domain: 'tools', authority: 'admin-ui' } }));
        });
    });

    const params = new URLSearchParams(window.location.search);
    const statusFilter = (params.get('filter') || '').toLowerCase();

    function applyRowFilters() {
        const query = filterInput?.value.trim().toLowerCase() || '';
        document.querySelectorAll('[data-tool-row]').forEach(row => {
            const search = row.getAttribute('data-tool-search') || '';
            const status = row.getAttribute('data-tool-status') || '';
            const matchesSearch = query.length === 0 || search.includes(query);
            const matchesStatus = !statusFilter || status === statusFilter;
            row.hidden = !(matchesSearch && matchesStatus);
        });
    }

    filterInput?.addEventListener('input', applyRowFilters);

    document.addEventListener('keydown', (event) => {
        const ctrl = event.ctrlKey || event.metaKey;
        if (ctrl && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            filterInput?.focus();
            filterInput?.select();
            return;
        }

        if (ctrl && event.shiftKey && event.key.toLowerCase() === 'e') {
            event.preventDefault();
            document.querySelector('[data-bulk-action="enable"]')?.click();
            return;
        }

        if (ctrl && event.shiftKey && event.key.toLowerCase() === 'd') {
            event.preventDefault();
            document.querySelector('[data-bulk-action="disable"]')?.click();
        }
    });

    applyRowFilters();
    syncBulkInputs();


    function emitTelemetry(eventName, payload) {
        window.dispatchEvent(new CustomEvent('admin:telemetry', { detail: { eventName, payload } }));
        console.info('[telemetry]', eventName, payload);
    }

    function snapshotFormDraft() {
        if (!form) return;
        const data = Array.from(form.querySelectorAll('input,textarea,select'))
            .filter((el) => el.name)
            .reduce((acc, el) => {
                acc[el.name] = el.type === 'checkbox' ? el.checked : el.value;
                return acc;
            }, {});
        sessionStorage.setItem(editorDraftKey, JSON.stringify({ updatedAt: new Date().toISOString(), data }));
    }

    if (form) {
        form.querySelectorAll('input,textarea,select').forEach((el) => {
            el.addEventListener('input', snapshotFormDraft);
            el.addEventListener('change', snapshotFormDraft);
        });
    }

    const existingConflictPanel = document.getElementById('admin-concurrency-conflict-panel');
    if (existingConflictPanel) {
        emitTelemetry('concurrency_conflict_encountered', { editor: 'tool' });
        existingConflictPanel.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const action = target.dataset.conflictAction;
            if (!action) return;
            emitTelemetry('concurrency_conflict_action_selected', { editor: 'tool', action });
            if (action === 'reload') {
                snapshotFormDraft();
                location.reload();
            }
            if (action === 'copy') {
                const draft = sessionStorage.getItem(editorDraftKey) ?? '{}';
                await navigator.clipboard.writeText(draft);
            }
            if (action === 'compare') {
                alert('Compare Changes is not available yet.');
            }
        });
    }

    if (!pane) return;
    const toolId = pane.dataset.toolId;
    if (!toolId) return;

    let graph = null;
    let localDraftGraph = null;
    const contentDraftKey = `admin-content-editor-draft-${toolId}`;
    const root = document.getElementById('content-editor-root');
    const status = document.getElementById('content-editor-status');
    const conflictHost = document.getElementById('content-conflict-panel-host');

    const defs = [
        { key: 'features', label: 'Features', type: 'value' },
        { key: 'steps', label: 'Steps', type: 'step' },
        { key: 'examples', label: 'Examples', type: 'example' },
        { key: 'faqs', label: 'FAQs', type: 'faq' },
        { key: 'useCases', label: 'Use Cases', type: 'value' },
        { key: 'relatedTools', label: 'Related Tools', type: 'related' }
    ];

    document.querySelector('[data-bs-target="#tab-content"]').addEventListener('shown.bs.tab', async () => {
        if (graph) return;
        status.textContent = 'Loading content graph...';
        const response = await fetch(`/api/admin/content/${toolId}`);
        if (!response.ok) { status.textContent = 'Failed loading content.'; return; }
        graph = await response.json();
        const cached = sessionStorage.getItem(contentDraftKey);
        if (cached) {
            localDraftGraph = JSON.parse(cached);
            graph = localDraftGraph;
            status.textContent = `Restored local draft for ${graph.toolName}.`;
        }
        render();
        status.textContent = `Editing content for ${graph.toolName}.`;
    });

    document.getElementById('save-content-btn').addEventListener('click', async () => {
        if (!graph) return;
        status.textContent = 'Saving...';
        const response = await fetch(`/api/admin/content/${toolId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(graph)
        });

        if (response.status === 409) {
            const envelope = await response.json();
            localDraftGraph = JSON.parse(JSON.stringify(graph));
            sessionStorage.setItem(contentDraftKey, JSON.stringify(localDraftGraph));
            renderConflictPanel(envelope);
            status.textContent = 'Conflict detected. Review conflict options below.';
            emitTelemetry('concurrency_conflict_encountered', { editor: 'content', resource: envelope.resource });
            return;
        }

        if (response.ok) {
            const saved = await response.json();
            graph = saved;
            sessionStorage.removeItem(contentDraftKey);
            conflictHost.innerHTML = "";
            status.textContent = 'Saved.';
            return;
        }

        status.textContent = 'Save failed.';
    });

    function render() {
        root.innerHTML = '';
        defs.forEach(def => {
            const wrap = document.createElement('div');
            wrap.className = 'mb-3 border rounded p-2';
            wrap.innerHTML = `<div class="d-flex justify-content-between"><strong>${def.label}</strong><button class="btn btn-outline-primary btn-sm" type="button">Add</button></div>`;
            const list = document.createElement('div');
            list.className = 'mt-2';
            wrap.appendChild(list);
            wrap.querySelector('button').addEventListener('click', () => { graph[def.key].push(newItem(def.type)); cacheContentDraft(); render(); });
            graph[def.key].forEach((item, idx) => list.appendChild(itemEditor(def, item, idx)));
            root.appendChild(wrap);
        });
    }

    function itemEditor(def, item, idx) {
        const row = document.createElement('div');
        row.className = 'border rounded p-2 mb-2';
        row.draggable = true;
        row.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', idx));
        row.addEventListener('dragover', e => e.preventDefault());
        row.addEventListener('drop', e => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData('text/plain'));
            const arr = graph[def.key];
            const [m] = arr.splice(from, 1);
            arr.splice(idx, 0, m);
            arr.forEach((x, i) => x.sortOrder = i);
            cacheContentDraft();
            render();
        });

        row.innerHTML = editorHtml(def.type, item);
        row.querySelectorAll('input,textarea,select').forEach(el => {
            el.addEventListener('input', () => { updateItem(def.type, item, row); cacheContentDraft(); });
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn btn-outline-danger btn-sm mt-1';
        remove.textContent = 'Remove';
        remove.addEventListener('click', () => { graph[def.key].splice(idx, 1); cacheContentDraft(); render(); });
        row.appendChild(remove);
        return row;
    }

    function editorHtml(type, item) {
        if (type === 'value') return `<input class='form-control form-control-sm' value='${escape(item.value ?? '')}'/>`;
        if (type === 'step') return `<input class='form-control form-control-sm mb-1' placeholder='Title' value='${escape(item.title ?? '')}'/><textarea class='form-control form-control-sm' placeholder='Description'>${escape(item.description ?? '')}</textarea>`;
        if (type === 'example') return `<input class='form-control form-control-sm mb-1' placeholder='Title' value='${escape(item.title ?? '')}'/><textarea class='form-control form-control-sm mb-1' placeholder='Input'>${escape(item.input ?? '')}</textarea><textarea class='form-control form-control-sm' placeholder='Output'>${escape(item.output ?? '')}</textarea>`;
        if (type === 'faq') return `<input class='form-control form-control-sm mb-1' placeholder='Question' value='${escape(item.question ?? '')}'/><textarea class='form-control form-control-sm' placeholder='Answer'>${escape(item.answer ?? '')}</textarea>`;
        if (type === 'related') return `<select class='form-select form-select-sm'>${graph.relatedToolOptions.map(o => `<option value='${o.slug}' ${o.slug===item.relatedSlug?'selected':''}>${o.name}</option>`).join('')}</select>`;
        return '';
    }


    function cacheContentDraft() {
        if (!graph) return;
        sessionStorage.setItem(contentDraftKey, JSON.stringify(graph));
    }

    function renderConflictPanel(envelope) {
        const lastModified = resolveLastModified(envelope.serverState);
        conflictHost.innerHTML = `
            <div class="alert alert-warning border-warning mb-3" role="alert">
                <div class="d-flex align-items-center mb-2">
                    <span class="badge bg-warning text-dark me-2">Concurrency conflict</span>
                    <strong>This item was modified by another operator.</strong>
                </div>
                <div class="small mb-2">${escape(envelope.message ?? '')}</div>
                <ul class="small mb-3">
                    <li><strong>Your version token:</strong> <code>${escape(envelope.clientVersionToken ?? 'n/a')}</code></li>
                    <li><strong>Server version token:</strong> <code>${escape(envelope.serverVersionToken ?? 'n/a')}</code></li>
                    ${lastModified ? `<li><strong>Last modified:</strong> ${escape(lastModified)}</li>` : ''}
                </ul>
                <div class="d-flex gap-2 flex-wrap">
                    <button type="button" class="btn btn-warning btn-sm" data-content-conflict-action="reload">Reload Latest</button>
                    <button type="button" class="btn btn-outline-warning btn-sm" data-content-conflict-action="copy">Copy My Changes</button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-content-conflict-action="compare">Compare Changes</button>
                </div>
            </div>`;

        conflictHost.querySelectorAll('[data-content-conflict-action]').forEach((button) => {
            button.addEventListener('click', async () => {
                const action = button.dataset.contentConflictAction;
                emitTelemetry('concurrency_conflict_action_selected', { editor: 'content', action });
                if (action === 'reload') {
                    const latestResponse = await fetch(`/api/admin/content/${toolId}`);
                    if (!latestResponse.ok) {
                        status.textContent = 'Reload failed.';
                        return;
                    }

                    const latest = await latestResponse.json();
                    graph = latest;
                    conflictHost.innerHTML = '';
                    status.textContent = 'Loaded latest server content. Your draft remains copied in session.';
                    render();
                    return;
                }

                if (action === 'copy') {
                    const draft = sessionStorage.getItem(contentDraftKey) ?? JSON.stringify(localDraftGraph ?? graph ?? {});
                    await navigator.clipboard.writeText(draft);
                    status.textContent = 'Draft copied to clipboard.';
                    return;
                }

                if (action === 'compare') {
                    alert('Compare Changes is not available yet.');
                }
            });
        });
    }

    function resolveLastModified(serverState) {
        if (!serverState || typeof serverState !== 'object') {
            return '';
        }

        return serverState.updatedAt || serverState.lastModifiedAt || serverState.modifiedAt || '';
    }

    function updateItem(type, item, row) {
        const els = row.querySelectorAll('input,textarea,select');
        if (type === 'value') item.value = els[0].value;
        if (type === 'step') { item.title = els[0].value; item.description = els[1].value; }
        if (type === 'example') { item.title = els[0].value; item.input = els[1].value; item.output = els[2].value; }
        if (type === 'faq') { item.question = els[0].value; item.answer = els[1].value; }
        if (type === 'related') { item.relatedSlug = els[0].value; }
    }

    function newItem(type) {
        if (type === 'value') return { id: 0, value: '', sortOrder: 0 };
        if (type === 'step') return { id: 0, title: '', description: '', sortOrder: 0 };
        if (type === 'example') return { id: 0, title: '', input: '', output: '', sortOrder: 0 };
        if (type === 'faq') return { id: 0, question: '', answer: '', sortOrder: 0 };
        return { id: 0, relatedSlug: graph.relatedToolOptions[0]?.slug ?? '', sortOrder: 0 };
    }

    function escape(v) { return (v || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'); }
})();
