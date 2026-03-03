# CSS Tool Runtime Ownership

## Layering contract

The runtime styling model is intentionally layered and should remain split across two files:

1. `upgread_shared-primitives.css` is the **canonical baseline owner** for tool runtime primitives.
2. `upgread_tool-execution-dna.css` is the **execution DNA override layer** for execution-specific layout and visual behavior.

## Why `upgread_shared-primitives.css` owns baseline

`upgread_shared-primitives.css` defines common, reusable primitives that must stay stable across all runtime contexts (workspace, docs, and shared shell structure). Keeping baseline ownership here:

- preserves a single source of truth for primitive defaults,
- prevents drift in foundational runtime selectors,
- keeps cross-surface behavior predictable for all tool shells.

## Why `upgread_tool-execution-dna.css` overrides exist

Execution surfaces need tighter, context-specific behavior (for example workspace split constraints, compact strips, and execution panel ergonomics) that should not globally redefine shared primitives. The execution DNA layer exists to:

- scope execution-only behavior without changing primitive ownership,
- allow targeted overrides where runtime execution UX differs from baseline,
- keep execution tuning isolated and easier to review.

## Risks of flattening these layers

Collapsing baseline and execution overrides into one undifferentiated layer introduces several risks:

- **Ownership ambiguity:** difficult to tell whether a rule is foundational or execution-specific.
- **Regression blast radius:** execution tweaks can unintentionally alter non-execution surfaces.
- **Maintenance friction:** reviewers lose clear intent boundaries, increasing accidental cascade coupling.
- **Refactor risk:** future consolidation work becomes unsafe because dependency direction is unclear.

Keep the layered model explicit: baseline primitives first, execution overrides second.
