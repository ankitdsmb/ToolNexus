# Run Order 4B — API Concurrency Contract

## Updated write request contracts

The following write endpoints now accept `versionToken` in the request body.

- `PUT /api/admin/tools/{id}`
- `PUT /api/admin/execution/{slug}`
- `PUT /api/admin/content/{toolId}`

`versionToken` is **transitionally optional** in this phase and is **required in an upcoming enforcement phase**.

## Conflict response contract (`409 Conflict`)

```json
{
  "error": "ConcurrencyConflict",
  "resource": "ToolDefinition",
  "clientVersionToken": "<client token>",
  "serverVersionToken": "<server token>",
  "serverState": {},
  "changedFields": ["status", "category"],
  "message": "Resource was modified by another user. Refresh and reconcile changes."
}
```

## Transitional compatibility behavior

When `versionToken` is omitted:

- write is still accepted,
- warning is logged,
- audit event `MissingVersionToken` is emitted.

No front-end/MVC form behavior changes are included in this phase.
