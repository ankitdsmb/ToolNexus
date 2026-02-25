# Tool Quality Score Domain

## Overview

ToolNexus now persists first-class quality scoring signals per tool in PostgreSQL via `tool_quality_scores`.
Scores are composed of:

- `score`
- `architectureScore`
- `testCoverageScore`
- `craftScore`
- `timestamp`

Each score record is keyed by `toolId + timestamp`.

## Data model

Table: `tool_quality_scores`

- `tool_id` (`varchar(120)`, PK part 1)
- `timestamp_utc` (`timestamp with time zone`, PK part 2)
- `score` (`numeric(5,2)`)
- `architecture_score` (`numeric(5,2)`)
- `test_coverage_score` (`numeric(5,2)`)
- `craft_score` (`numeric(5,2)`)

Indexes:

- `idx_tool_quality_scores_tool_id`
- `idx_tool_quality_scores_timestamp_utc`

## Governance integration

Execution admission now checks the latest stored quality score for the executing tool.
If `latest.score < ExecutionAdmission:MinimumQualityScore`, admission is denied with reason code `LowQualityScore`.

This makes quality posture an explicit governance gate.

## Admin UI

A dedicated dashboard is available at:

- `/admin/governance/quality-scores`

It loads from API endpoint:

- `GET /api/admin/governance/quality-scores`

The dashboard includes:

- latest score per tool
- recent scoring events
- tool/date filtering

