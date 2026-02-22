# README Structure Map

## Source Model Mapping
- **Intro** → `ToolContent.Intro`, hero summary.
- **Long overview** → `ToolContent.LongDescription`.
- **Quick usage** → `ToolContent.Steps` (ordered workflow).
- **Examples** → `ToolContent.Examples` (input/output cards).
- **Use cases** → `ToolContent.UseCases`.
- **FAQ** → `ToolContent.Faq`.
- **Troubleshooting** → tip panel inside quick start.
- **Related tools** → related, same-category, and next-tool collections.

## Product Layout Sequence
1. Tool Hero
2. Runtime Workspace (`#tool-root`, unchanged runtime mount)
3. Quick Start Panel
4. Example Cards
5. Use Cases
6. FAQ
7. Related Tools

## Content Compression Rules
- Keep paragraph blocks under ~3 lines where possible.
- Prefer cards, lists, and step clusters over long markdown prose.
- Keep every section actionable (what to do next).
