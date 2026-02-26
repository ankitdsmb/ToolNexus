# 06) AI Workflow Rules (Human + AI Collaboration)

## Purpose
Define the mandatory collaboration workflow between human contributors and AI agents for ToolNexus UI work.

## Mandatory Rules
1. **Constitution-first review**
   - Every AI agent must read the full `docs/ui-constitution/` folder before proposing or changing implementation.

2. **Polish allowed, redesign forbidden**
   - AI may improve wording, clarity, and readability.
   - AI must not redesign architecture, execution lifecycle, or platform structure.

3. **Approval gate for structural change**
   - Any change affecting layout structure or lifecycle behavior requires explicit architect approval before implementation.

4. **ToolShell contract alignment**
   - All implementation must align with the ToolShell contract and platform UI constitution.

5. **No alternate execution paths**
   - AI must not introduce parallel/alternate execution flows that bypass canonical platform behavior.

## Pre-Change Validation Checklist (AI)
Before writing code, the AI must confirm all items:

- [ ] I read the UI constitution documents in `docs/ui-constitution/`.
- [ ] My changes are wording/readability or approved implementation-only updates.
- [ ] I am not redesigning architecture, layout skeleton, or execution lifecycle.
- [ ] Any layout/lifecycle impact has explicit architect approval recorded.
- [ ] The implementation aligns with the ToolShell contract.
- [ ] I am not creating an alternate execution path.
