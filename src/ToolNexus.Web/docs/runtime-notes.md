# Runtime Notes

Under the hood, ToolNexus is split into a web layer, application layer, and infrastructure layer.

That keeps the UI side straightforward while execution logic stays testable and reusable.

## Why this matters

When we add new tools, we don't want routing or UI code to become a tangle.

This setup lets us plug in features without rewriting the whole app.

## Quick mental model

- **Web**: routes, pages, views
- **Application**: orchestration and policies
- **Infrastructure**: persistence and runtime integrations

It's not fancy. It's just easier to maintain.
