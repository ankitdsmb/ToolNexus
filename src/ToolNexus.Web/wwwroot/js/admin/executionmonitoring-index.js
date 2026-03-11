const page=1, pageSize=15;
  const feedback=document.getElementById('ops-feedback');
  const refreshButton=document.getElementById('refresh-monitoring');
  const state={loading:false};

  const statusClass=s=>s==='success'?'bg-green-lt':(s==='blocked'?'bg-red-lt':(s==='failed'?'bg-orange-lt':'bg-yellow-lt'));
  const sevClass=s=>s==='critical'?'bg-red-lt':(s==='warning'?'bg-yellow-lt':'bg-secondary-lt');

  function setLoading(isLoading){
    state.loading=isLoading;
    refreshButton.disabled=isLoading;
    refreshButton.textContent=isLoading?'Refreshing…':'Refresh workspace';
  }

  function notify(message, type='info'){
    feedback.className=`alert alert-${type}`;
    feedback.classList.remove('d-none');
    feedback.textContent=message;
  }

  function clearNotification(){
    feedback.classList.add('d-none');
    feedback.textContent='';
  }

  async function fetchJson(url, options){
    const response=await fetch(url, options);
    if(!response.ok){
      const text=await response.text();
      throw new Error(`${response.status} ${response.statusText}${text?` - ${text.substring(0,160)}`:''}`);
    }
    return response.status===204?null:response.json();
  }

  async function loadHealth(){
    const h=await fetchJson('/admin/execution/health');
    document.getElementById('pending-count').textContent=`pending ${h.pendingItems}`;
    document.getElementById('retry-count').textContent=`retry ${h.retryCount}`;
    document.getElementById('dead-letter-count').textContent=`dead ${h.deadLetterCount}`;
  }

  async function loadStream(){
    const items=await fetchJson('/admin/execution/stream?take=25');
    const body=document.getElementById('stream-body');
    body.innerHTML='';
    (items||[]).forEach(x=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${x.executedAtUtc}</td><td>${x.toolId}</td><td>${x.authority}</td><td>${x.adapter}</td><td>${x.runtimeIdentity}</td><td>${x.governanceResult}</td><td>${x.durationMs}ms</td><td><span class="badge ${statusClass(x.status)}">${x.status}</span></td>`;
      body.appendChild(tr);
    });
  }

  async function loadGovernance(){
    const g=await fetchJson('/admin/execution/governance');
    document.getElementById('governance-summary').textContent=`Approved ${g.approvedDecisions} · Blocked ${g.blockedExecutions} · Review ${g.requiresApproval}`;
  }

  async function loadCapability(){
    const c=await fetchJson('/admin/execution/capability-lifecycle');
    document.getElementById('capability-summary').textContent=`Draft ${c.draft} · Review ${c.review} · Approved ${c.approved} · Active ${c.active} · Deprecated ${c.deprecated}`;
  }

  async function loadQuality(){
    const q=await fetchJson('/admin/execution/quality');
    document.getElementById('quality-summary').textContent=`Score ${q.averageQualityScore} · Conformance failures ${q.conformanceFailures} · Instability ${q.runtimeInstabilitySignals} · Anomalies ${q.anomalyAlerts}`;
  }

  async function loadIncidents(){
    const data=await fetchJson(`/admin/execution/incidents?page=${page}&pageSize=${pageSize}`);
    const body=document.getElementById('incidents-body');
    body.innerHTML='';
    (data.items||[]).forEach(i=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${i.occurredAtUtc}</td><td><span class="badge ${sevClass(i.severity)}">${i.severity}/${i.eventType}</span></td><td>${i.destination}</td><td>${i.summary}</td><td class="text-end">${i.attemptCount}</td>`;
      body.appendChild(tr);
    });
  }

  async function decideOptimization(id, action){
    const operatorId=prompt('Enter operator id for optimization audit:'); if(!operatorId) return;
    const authorityContext='human-governed';
    const scheduledForUtc=action==='schedule-rollout'?new Date(Date.now()+3600000).toISOString():null;
    await fetchJson(`/admin/execution/optimization/${id}/${action}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({operatorId,authorityContext,notes:'decision from optimization center',scheduledForUtc})});
    notify(`Optimization ${action} completed.`, 'success');
    await loadOptimization();
  }

  function appendOptimizationRows(items, domain){
    const body=document.getElementById('optimization-body');
    items.forEach(x=>{
      const tr=document.createElement('tr');
      const sim=x.latestSimulation?`${x.latestSimulation.summary} (risk Δ ${x.latestSimulation.projectedRiskDelta})`:'missing simulation';
      tr.innerHTML=`<td>${domain}</td><td>${x.recommendation.suggestedChange}</td><td>${x.recommendation.confidenceScore}</td><td>${sim}</td><td><button class="btn btn-sm btn-outline-success me-1" data-opt-id="${x.recommendation.recommendationId}" data-opt-action="approve" type="button">Approve</button><button class="btn btn-sm btn-outline-danger me-1" data-opt-id="${x.recommendation.recommendationId}" data-opt-action="reject" type="button">Reject</button><button class="btn btn-sm btn-outline-primary" data-opt-id="${x.recommendation.recommendationId}" data-opt-action="schedule-rollout" type="button">Schedule</button></td>`;
      body.appendChild(tr);
    });
  }

  async function loadOptimization(){
    const data=await fetchJson('/admin/execution/optimization?take=10');
    const body=document.getElementById('optimization-body');
    body.innerHTML='';
    appendOptimizationRows(data.runtimeRecommendations||[], 'runtime');
    appendOptimizationRows(data.governanceOptimization||[], 'governance');
    appendOptimizationRows(data.uxOptimization||[], 'ux');
    appendOptimizationRows(data.qualityOptimization||[], 'quality');
    appendOptimizationRows(data.aiGenerationImprovements||[], 'ai-capability');
    document.querySelectorAll('[data-opt-action]').forEach(b=>b.addEventListener('click',()=>decideOptimization(b.dataset.optId,b.dataset.optAction)));
  }

  async function decideInsight(id, decision){
    const operatorId=prompt('Enter operator id for audit:'); if(!operatorId) return;
    await fetchJson(`/admin/execution/autonomous-insights/${id}/${decision}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({operatorId,authorityContext:'operator-governed',notes:'decision from command center'})});
    notify(`Autonomous insight ${decision} completed.`, 'success');
    await loadAutonomy();
  }

  async function loadAutonomy(){
    const data=await fetchJson('/admin/execution/autonomous-insights?take=15');
    const body=document.getElementById('autonomy-body');
    body.innerHTML='';
    (data.items||[]).forEach(x=>{
      const tr=document.createElement('tr');
      const riskBadge=x.riskScore>=0.8?'bg-red-lt':(x.riskScore>=0.5?'bg-yellow-lt':'bg-green-lt');
      tr.innerHTML=`<td><span class="badge bg-blue-lt">AI</span> ${x.proposedAction}</td><td><span class="badge ${riskBadge}">${x.riskScore}</span></td><td>${x.confidenceScore}</td><td>${x.impactScope}</td><td><button class="btn btn-sm btn-outline-success me-1" data-ai-id="${x.insightId}" data-ai-decision="approve" type="button">Approve</button><button class="btn btn-sm btn-outline-danger" data-ai-id="${x.insightId}" data-ai-decision="reject" type="button">Reject</button></td>`;
      body.appendChild(tr);
    });
    document.querySelectorAll('[data-ai-decision]').forEach(b=>b.addEventListener('click',()=>decideInsight(b.dataset.aiId,b.dataset.aiDecision)));
  }

  async function runCommand(command){
    const reason=prompt(`Confirm ${command}. Enter reason:`); if(!reason) return;
    const risk=document.querySelector(`[data-command="${command}"]`)?.dataset.risk ?? 'medium';
    const confirmation=prompt(`Risk level ${risk.toUpperCase()}. Type CONFIRM to execute ${command}.`); if(confirmation!=='CONFIRM') return;
    await fetchJson(`/admin/execution/operations/${command}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({reason,impactScope:'global-runtime',authorityContext:'operator',rollbackPlan:'Use queue replay or manual restore'})});
    notify(`Operator command ${command} executed successfully.`, 'success');
    await refresh();
  }

  async function refresh(){
    if(state.loading) return;
    setLoading(true);
    clearNotification();
    try {
      await Promise.all([loadHealth(),loadStream(),loadGovernance(),loadCapability(),loadQuality(),loadIncidents(),loadAutonomy(),loadOptimization()]);
    } catch(error) {
      notify(`Command center refresh failed: ${error.message}`, 'danger');
      console.error('Command center refresh failed', error);
    } finally {
      setLoading(false);
    }
  }

  document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>runCommand(b.dataset.command).catch(error=>{
    notify(`Operator command failed: ${error.message}`, 'danger');
    console.error('Operator action failed', error);
  })));

  refreshButton.addEventListener('click',refresh);
  setInterval(()=>{loadHealth().catch(()=>{});loadStream().catch(()=>{});},5000);
  await refresh();
