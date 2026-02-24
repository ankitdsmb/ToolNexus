# Prompt Template (Generic, Reusable)

## Goal
Define a single clear objective and expected deliverable.

## Constraints
- Preserve existing behavior unless explicitly requested.
- Follow repository architecture and coding standards.
- Validate with automated checks before completion.

## Required Workflow
1. Analyze current implementation and related docs/tests first.
2. Propose/execute minimal safe changes.
3. Run relevant build + test + runtime checks.
4. Summarize changes, evidence, and remaining risks.

## Output Contract
- Files changed + why.
- Tests/checks run + results.
- Known limitations or follow-up tasks.

## Effective Prompt Skeleton
```text
You are acting as Architect -> QA -> Engineer -> Reviewer.

Objective:
<what to deliver>

Scope:
<files/modules/integration boundaries>

Rules:
- do not break existing behavior
- no speculative refactors
- evidence-driven fixes only

Validation:
- <build commands>
- <test commands>
- <runtime checks>

Return:
- summary of modifications
- verification results
- open risks
```
