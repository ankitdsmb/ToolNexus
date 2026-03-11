(() => {
  const payloadEl = document.getElementById('ai-json');
  const statusEl = document.getElementById('import-status');
  const toolIdeaEl = document.getElementById('tool-idea');
  const errorsEl = document.getElementById('import-errors');
  const previewLink = document.getElementById('preview-link');
  let cachedTemplate = null;
  let currentSlug = null;
  let lastSuggestions = [];

  const setStatus = (message, isError = false) => {
    statusEl.textContent = message;
    statusEl.className = isError ? 'small mt-2 text-danger' : 'small mt-2 text-secondary';
  };

  const setErrors = (errors) => {
    errorsEl.innerHTML = '';
    if (!errors?.length) return;
    const ul = document.createElement('ul');
    ul.className = 'text-danger small mb-0';
    errors.forEach(e => {
      const li = document.createElement('li');
      li.textContent = e;
      ul.appendChild(li);
    });
    errorsEl.appendChild(ul);
  };

  const loadTemplate = async () => {
    if (cachedTemplate) return cachedTemplate;
    const response = await fetch('/admin/ai-capability-factory/import/template');
    if (!response.ok) throw new Error('Template load failed.');
    cachedTemplate = await response.json();
    return cachedTemplate;
  };

  document.getElementById('download-template').addEventListener('click', async () => {
    const template = await loadTemplate();
    const blob = new Blob([template.jsonTemplate], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'toolnexus-ai-import-template.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('copy-prompt').addEventListener('click', async () => {
    const template = await loadTemplate();
    await navigator.clipboard.writeText(template.prompt);
    setStatus('Prompt copied to clipboard.');
  });

  document.getElementById('validate-json').addEventListener('click', async () => {
    setErrors([]);
    previewLink.classList.add('d-none');
    const response = await fetch('/admin/ai-capability-factory/import/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonPayload: payloadEl.value, correlationId: 'admin-ui-validation', tenantId: 'admin' })
    });

    if (!response.ok) {
      setStatus('Validation request failed.', true);
      return;
    }

    const result = await response.json();
    if (!result.isValid) {
      setStatus('Validation failed.', true);
      setErrors(result.errors || []);
      return;
    }

    setStatus('Validation passed. Draft import is allowed.');
  });

  document.getElementById('generate-contract').addEventListener('click', async () => {
    setErrors([]);
    previewLink.classList.add('d-none');
    const response = await fetch('/admin/ai-capability-factory/import/generate-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolIdea: toolIdeaEl.value,
        existingToolSlugs: [],
        correlationId: 'admin-ui-generate-contract',
        tenantId: 'admin'
      })
    });

    if (!response.ok) {
      setStatus('Contract generation failed.', true);
      return;
    }

    const result = await response.json();
    if (result.status === 'duplicate') {
      setStatus(result.message || 'Tool already exists.', true);
      payloadEl.value = JSON.stringify(result, null, 2);
      return;
    }

    payloadEl.value = result.contractJson || '';
    setStatus(`Contract generated for '${result.slug}'. Review and validate before creating draft.`);
  });

  document.getElementById('create-draft').addEventListener('click', async () => {
    setErrors([]);
    previewLink.classList.add('d-none');
    const response = await fetch('/admin/ai-capability-factory/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonPayload: payloadEl.value, correlationId: 'admin-ui-import', tenantId: 'admin' })
    });

    if (!response.ok) {
      setStatus('Draft creation failed.', true);
      return;
    }

    const draft = await response.json();
    setStatus(`Draft created for slug '${draft.slug}' with ShadowOnly governance default.`);
    currentSlug = draft.slug;
    previewLink.href = `/admin/ai-capability-factory/import/preview/${encodeURIComponent(draft.slug)}`;
    previewLink.classList.remove('d-none');
    await loadDashboard();
  });

  const render = (id, items, formatter) => {
    const list = document.getElementById(id);
    list.innerHTML = '';
    if (!items?.length) {
      list.innerHTML = '<li class="text-secondary">No records yet.</li>';
      return;
    }

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'mb-1';
      li.textContent = formatter(item);
      list.appendChild(li);
    });
  };

  const loadDashboard = async () => {
    const response = await fetch('/admin/ai-capability-factory/dashboard?take=25');
    if (!response.ok) return;
    const data = await response.json();
    render('draft-queue', data.draftQueue, x => `${x.toolSlug} · ${x.status} · quality ${x.draftQualityScore}`);
    render('validation-reports', data.validationReports, x => `${x.draftId} · passed=${x.passed}`);
  };



  const inspectionEl = document.getElementById('inspection-output');
  const setInspection = (payload) => {
    inspectionEl.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  };

  const requireSlug = () => {
    if (!currentSlug) {
      setStatus('Create draft first to continue workflow.', true);
      return null;
    }
    return currentSlug;
  };

  document.getElementById('inspect-runtime').addEventListener('click', async () => {
    const slug = requireSlug();
    if (!slug) return;
    const response = await fetch(`/admin/ai-capability-factory/import/${encodeURIComponent(slug)}/runtime-inspection`);
    if (!response.ok) {
      setStatus('Runtime inspection failed.', true);
      return;
    }

    const result = await response.json();
    setInspection(result);
    setStatus(`Runtime inspection completed for '${slug}'.`);
  });

  document.getElementById('contract-suggestions').addEventListener('click', async () => {
    const slug = requireSlug();
    if (!slug) return;
    const response = await fetch(`/admin/ai-capability-factory/import/${encodeURIComponent(slug)}/suggestions`);
    if (!response.ok) {
      setStatus('Suggestion analysis failed.', true);
      return;
    }

    const result = await response.json();
    lastSuggestions = result.suggestions || [];
    setInspection(result);
    setStatus(`Loaded ${lastSuggestions.length} contract suggestion(s).`);
  });

  document.getElementById('apply-suggestions').addEventListener('click', async () => {
    const slug = requireSlug();
    if (!slug) return;
    if (!lastSuggestions.length) {
      setStatus('Load suggestions first.', true);
      return;
    }

    const operations = lastSuggestions.filter(x => x.suggestedValue !== undefined).map(x => ({
      op: x.jsonPointerPath === '/files/-' ? 'add' : 'replace',
      path: x.jsonPointerPath,
      value: x.suggestedValue
    }));

    const response = await fetch(`/admin/ai-capability-factory/import/${encodeURIComponent(slug)}/patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations, correlationId: 'admin-ui-json-patch', tenantId: 'admin', requestedBy: 'admin-ui' })
    });

    if (!response.ok) {
      setStatus('Patch update failed.', true);
      return;
    }

    const record = await response.json();
    setInspection(record);
    setStatus(`JSON patch update applied. Version=${record.version}.`);
  });

  const decision = async (approve) => {
    const slug = requireSlug();
    if (!slug) return;
    const path = approve ? 'decision' : 'decision';
    const response = await fetch(`/admin/ai-capability-factory/import/${encodeURIComponent(slug)}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve, correlationId: approve ? 'admin-ui-approve' : 'admin-ui-reject', tenantId: 'admin', decidedBy: 'admin-ui', comment: approve ? 'Approved in admin flow' : 'Rejected in admin flow' })
    });

    if (!response.ok) {
      setStatus('Approval decision failed.', true);
      return;
    }

    const record = await response.json();
    setInspection(record);
    setStatus(`Decision applied: ${record.approvalStatus}.`);
  };

  document.getElementById('submit-approval').addEventListener('click', async () => {
    const slug = requireSlug();
    if (!slug) return;
    const response = await fetch(`/admin/ai-capability-factory/import/${encodeURIComponent(slug)}/submit-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correlationId: 'admin-ui-submit-approval', tenantId: 'admin', requestedBy: 'admin-ui', comment: 'Ready for approval review' })
    });

    if (!response.ok) {
      setStatus('Submit approval failed.', true);
      return;
    }

    const record = await response.json();
    setInspection(record);
    setStatus(`Submitted for approval. Status=${record.approvalStatus}.`);
  });

  document.getElementById('approve-draft').addEventListener('click', async () => await decision(true));
  document.getElementById('reject-draft').addEventListener('click', async () => await decision(false));


  loadDashboard();
})();
