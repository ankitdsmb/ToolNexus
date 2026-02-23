# Run Orders 11–14 Enhancement Sprint

## Scope
This sprint completes four admin/operator enhancements without introducing architecture changes:

1. Analytics drilldown depth and navigation
2. Bulk-safe admin actions
3. Operator UX productivity improvements
4. Command palette admin integration for safe operations

## Operator Workflows

### Tool Workspace (Bulk Admin Actions)
- Use **Select Visible** and row checkboxes to multi-select tools.
- Use **Enable Selected** / **Disable Selected** for bulk-safe status updates.
- Confirm each bulk or single status change before it is submitted.
- Optional URL filter: `?filter=enabled` or `?filter=disabled` to jump into pre-filtered slices.
- Keyboard shortcuts:
  - `Ctrl/Cmd + F` focus tool filter
  - `Ctrl/Cmd + Shift + E` bulk enable selected
  - `Ctrl/Cmd + Shift + D` bulk disable selected

### Execution Monitoring (Operator-first UX)
- Quick actions:
  - **Workers** button jumps to worker health table
  - **Incidents** button jumps to incident timeline
  - **Refresh** triggers a full monitor refresh
- URL focus jump:
  - `?focus=incidents` auto-scrolls to incident panel
- Keyboard shortcuts:
  - `Ctrl/Cmd + R` refresh monitoring data
  - `Alt + I` jump to incidents panel

## Analytics Drilldown Usage

### Filters
- **Tool slug** filter narrows drilldown rows.
- **Start date / End date** filter scopes server-side query window.
- Paging controls avoid loading full result sets.

### Drilldown Detail
- Drilldown rows expose tool slug buttons.
- Selecting a slug opens **Tool Detail Drilldown** with:
  - total executions
  - total failures
  - success rate
  - avg duration
  - daily breakdown rows for the selected range

### Quick Navigation
- Analytics summary cards still provide in-page panel jumps.
- Dashboard quick action links provide direct drilldown entry points.

## Command Palette Capabilities (Admin)

Admin command palette now includes safe, navigation-only actions:
- open module: dashboard, tools, analytics, execution monitoring, change history
- filter jump: tools enabled/disabled slices
- drilldown jump: analytics top tools/slow tools/drilldown
- execution jump: incident timeline focus

> No runtime mutation commands were added.

## Performance Considerations
- Drilldown and detail remain server-side queried.
- Paging retained for drilldown and incident timelines.
- Filter jumps use URL query parameters and lazy panel rendering on demand.
