# Capability Marketplace Foundation

## Why `capability` != `tool`

A **tool** is the executable unit already present in ToolNexus (slug, actions, runtime behavior).
A **capability** is the marketplace-facing metadata contract that describes installation state,
provider identity, governance posture, and the link back to a tool.

This separation lets us:

- evolve lifecycle and governance metadata without changing tool runtime behavior,
- support future third-party providers without rewriting core tool execution,
- expose discovery data for UI/API consumers independently from execution internals.

## Registry model

Marketplace foundation introduces `CapabilityRegistryEntry` with:

- `capabilityId`
- `provider`
- `version`
- `toolId`
- `runtimeLanguage`
- `complexityTier`
- `permissions`
- `status` (`installed`, `disabled`, `deprecated`)
- installation lifecycle state
- explicit tool link metadata
- governance metadata (authority + snapshot id + policy version token)

Registry is metadata-only and does not execute tools.

## Installation model and lifecycle

Installation lifecycle states:

1. `installed`
2. `enabled`
3. `disabled`
4. `deprecated`

Current derivation rules:

- deprecated tool manifests map to `deprecated`,
- non-deprecated tools with enabled policy map to `enabled`,
- non-deprecated tools with disabled policy map to `disabled`.

`status` is reduced from lifecycle for compatibility:

- enabled/installed lifecycle -> `installed` status,
- disabled lifecycle -> `disabled` status,
- deprecated lifecycle -> `deprecated` status.

## Tool linking strategy

Each capability includes a `CapabilityToolLink`:

- `CapabilityId`: deterministic id (`cap:{toolSlug}:{version}`)
- `ToolId`: existing tool slug

This preserves backward compatibility because execution still routes by tool slug,
while discovery and marketplace metadata use capability ids.

## Governance reuse

Capability discovery reuses existing governance infrastructure:

- **policy evaluation** via `IExecutionPolicyService`,
- **authority resolution** via `IExecutionAuthorityResolver`,
- **snapshot tracking** via `IExecutionSnapshotBuilder`.

No duplicate policy/governance engine is introduced.

## Discovery API surface (internal)

`ICapabilityMarketplaceService.GetInstalledCapabilities()` returns installed capability
metadata for future marketplace/admin UI listing.

No public marketplace UI is included in this foundation slice.

## Backward compatibility

- Tool execution pipeline remains unchanged.
- No behavior changes in runtime adapters, orchestration, or executor dispatch.
- Capability marketplace layer is additive and read-only metadata infrastructure.

## Full integration (strict completeness update)

Capability marketplace is now integrated across platform layers:

- **Persistence (PostgreSQL):** `capability_registry` stores immutable capability identity and synced governance metadata (`authority`, `snapshot_id`, `policy_version_token`, policy enabled flag), with indexes on `tool_id` and `synced_at_utc`.
- **Repository:** `ICapabilityMarketplaceRepository` + `EfCapabilityMarketplaceRepository` upsert computed capability metadata and serve admin query dashboards.
- **API:** `GET /api/admin/capabilities/marketplace` exposes governed capability records for admin diagnostics and filtering (`toolId`, `status`, `syncedAfterUtc`, `limit`).
- **Admin UI:** `/admin/capabilities/marketplace` adds first-class registry visibility in Admin shell.
- **Configuration:** `CapabilityMarketplace:SyncOnRead` and `CapabilityMarketplace:MaxDashboardLimit` enforce operational control and bounded dashboard queries.

Execution architecture remains canonical. Capability records are computed from existing governance + authority resolver and never bypass execution admission or conformance pipeline.
