const driftBody=document.querySelector('#drift-table tbody');
  const recBody=document.querySelector('#recommendation-table tbody');
  const simBody=document.querySelector('#simulation-table tbody');
  const growth=document.querySelector('#growth-list');
  const debt=document.querySelector('#debt-list');

  async function review(id,action){
    await fetch(`/api/admin/architecture/evolution/recommendations/${id}/review`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,architectId:'admin-ui',notes:'reviewed in architecture evolution center',correlationId:crypto.randomUUID(),tenantId:'default'})});
    await load();
  }

  async function load(){
    const res=await fetch('/api/admin/architecture/evolution/dashboard?limit=20');
    if(!res.ok){return;}
    const data=await res.json();
    driftBody.innerHTML='';
    (data.driftAlerts||[]).forEach(x=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${x.affectedDomain}</td><td>${x.driftType}</td><td>${x.driftScore}</td><td>${x.riskLevel}</td><td>${x.detectedAtUtc}</td>`; driftBody.appendChild(tr);});
    recBody.innerHTML='';
    (data.evolutionSuggestions||[]).forEach(x=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${x.affectedDomain}</td><td>${x.architectureImpactLevel}</td><td>${x.riskLevel}</td><td>${x.confidenceScore}</td><td><button class='btn btn-success btn-xs' data-a='approve-roadmap' data-id='${x.recommendationId}'>Approve</button> <button class='btn btn-outline-danger btn-xs' data-a='reject-recommendation' data-id='${x.recommendationId}'>Reject</button> <button class='btn btn-outline-secondary btn-xs' data-a='future-review' data-id='${x.recommendationId}'>Future</button></td>`; recBody.appendChild(tr);});
    recBody.querySelectorAll('button[data-a]').forEach(b=>b.addEventListener('click',()=>review(b.dataset.id,b.dataset.a)));
    simBody.innerHTML='';
    (data.simulationReports||[]).forEach(x=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${x.recommendationId}</td><td>${x.executionFlowImpact}</td><td>${x.governanceFlowImpact}</td><td>${x.dataModelImpact}</td><td>${x.migrationComplexity}</td>`; simBody.appendChild(tr);});
    growth.innerHTML='';
    (data.growthForecast||[]).forEach(x=>{const li=document.createElement('li'); li.className='list-group-item'; li.textContent=`${x.affectedDomain}: benefit ${x.expectedPlatformBenefit} / migration cost ${x.estimatedMigrationCost}`; growth.appendChild(li);});
    debt.innerHTML='';
    (data.architecturalDebtTracker||[]).forEach(x=>{const li=document.createElement('li'); li.className='list-group-item'; li.textContent=`${x.affectedDomain}: drift ${x.driftScore} (${x.summary})`; debt.appendChild(li);});
  }

  document.getElementById('run-drift').addEventListener('click', async ()=>{await fetch('/api/admin/architecture/evolution/drift/detect',{method:'POST'}); await load();});
  document.getElementById('run-recommendations').addEventListener('click', async ()=>{await fetch('/api/admin/architecture/evolution/recommendations/generate',{method:'POST'}); await load();});
  await load();
