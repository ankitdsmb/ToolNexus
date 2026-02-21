# DESIGN_DNA

## Spacing System
- Tokenized spacing with both numeric (`--space-1..8`) and semantic (`--space-xs..2xl`) scales.
- Current scale has duplicated values; semantics are present but precision hierarchy is weak.

## Container Widths
- Design tokens define `--container-max: 1280px`; UI system defines `--page-max-width: 1200px`.
- Gutter token uses clamp for responsive side padding.

## Typography Scale
- Display/headline/body/caption tokens exist and are reused in tool shell styles.
- Fluid display sizing used via `clamp`.

## Hero Layout Structure
- Tool shell hero includes title/description + metadata chips.
- Two-column content layout for runtime + SEO docs on larger screens, collapsing to single column on smaller breakpoints.

## Card System
- Panel/card styling standardized through border, radius, elevation, and tokenized padding.

## Section Patterns
- Reusable docs sections: overview, features, steps, examples, FAQ, use-cases, related tools.
- Consistent heading hierarchy improves crawlability and information scent.

## Reusable Design Primitives
- Chips, tool panels, containers, focus states, and button control sizing are centralized via CSS tokens/system selectors.
