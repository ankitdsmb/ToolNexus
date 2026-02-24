# Runtime Incident Reporting

## Data flow

```text
runtime-incident-reporter.js
  -> POST /api/admin/runtime/incidents
  -> RuntimeIncidentsController
  -> RuntimeIncidentService
  -> EfRuntimeIncidentRepository
  -> RuntimeIncidents table
```

## API contract

`POST /api/admin/runtime/incidents`

Each incident supports:
- `correlationId`
- `toolSlug`
- `severity`
- `message`
- `timestamp`
- `metadata` (JSON object)

## Startup and reliability

- Schema recovery logic retries with migrations when runtime incident schema drift is detected.
- Controller validates payload and returns `400` for invalid body, `200` for accepted valid payload.

## Failure scenarios

- Invalid payload: request rejected with `400` and no DB write.
- DB transient failure: repository attempts schema recovery and retries operation.
