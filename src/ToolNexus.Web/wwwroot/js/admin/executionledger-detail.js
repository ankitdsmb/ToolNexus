const detailNode = document.getElementById('detail-json');
const id = detailNode?.dataset.executionId;

if (detailNode && id) {
  const [detailRes, snapshotRes] = await Promise.all([
    fetch(`/api/admin/executions/${id}`),
    fetch(`/api/admin/executions/${id}/snapshot`)
  ]);

  if (!detailRes.ok) {
    detailNode.textContent = 'Not found';
  } else {
    const detail = await detailRes.json();
    const snapshot = snapshotRes.ok ? await snapshotRes.json() : null;

    detailNode.textContent = JSON.stringify({
      runtimeIdentity: detail.runtimeIdentity,
      authority: detail.authorityDecision,
      snapshotMetadata: snapshot,
      conformanceResult: detail.conformance,
      traceId: detail.traceId
    }, null, 2);
  }
}
