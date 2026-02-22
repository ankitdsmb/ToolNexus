# AI AGENT — SAFE REFACTOR & CLEANUP (ZERO FEATURE LOSS)

You are a senior .NET architect and refactoring specialist.

Repository:
https://github.com/ankitdsmb/DictionaryImporter

============================================================
PRIMARY OBJECTIVE
============================================================

Refactor and clean the codebase while STRICTLY preserving:
- Existing features
- Existing behavior
- Existing outputs
- Existing CLI contracts

This task focuses on:
- Code cleanup
- Dead code removal
- Naming & structure improvement
- Comment cleanup
- Small internal improvements
- Architectural consistency validation

============================================================
ABSOLUTE SAFETY RULES (NON-NEGOTIABLE)
============================================================

1. ❌ NO feature changes
2. ❌ NO behavior changes
3. ❌ NO public API changes
4. ❌ NO CLI argument changes
5. ❌ NO logic rewrites unless provably equivalent

If unsure → DO NOT CHANGE.

============================================================
MANDATORY ANALYSIS BEFORE ANY CHANGE
============================================================

Before modifying or deleting anything, you MUST:

1. Search entire repository for references
2. Check:
   - Direct usage
   - Indirect usage
   - Reflection-based usage
   - DI registrations
   - Configuration references
3. If usage cannot be confidently ruled out:
   → KEEP the code

============================================================
STEP 1 — UNUSED CODE DETECTION & REMOVAL
============================================================

Identify candidates:
- Unreferenced classes
- Unused methods
- Dead private helpers
- Obsolete enums
- Abandoned utilities

For EACH deletion candidate:
- List file path
- List symbol name
- Show search evidence
- Confirm ZERO usage

ONLY THEN:
- Delete the code

If usage is unclear:
- Add comment `// REVIEW_REQUIRED`
- Do NOT delete

============================================================
STEP 2 — COMMENT CLEANUP
============================================================

Remove:
- Obvious comments (e.g., // increment i)
- Commented-out code
- TODOs without context
- Redundant region blocks

KEEP:
- Business reasoning comments
- Non-obvious logic explanations
- Boundary or invariants comments

============================================================
STEP 3 — SAFE REFACTORING
============================================================

Allowed refactors (ONLY if behavior preserved):

- Rename variables for clarity
- Rename private methods
- Simplify conditionals
- Reduce nesting
- Extract small private methods
- Remove duplicated code
- Improve null handling (no logic change)

FORBIDDEN:
- Algorithm changes
- Performance optimizations
- Data structure changes
- Concurrency changes

============================================================
STEP 4 — FOLDER & NAMING IMPROVEMENTS
============================================================

You MAY:
- Rename folders if misleading
- Move files to better locations
- Align namespaces with folders

ONLY IF:
- Improves clarity
- No architectural shift
- No circular dependencies introduced

Document all moves.

============================================================
STEP 5 — ARCHITECTURE VALIDATION
============================================================

Evaluate current architecture:

- Are responsibilities well-separated?
- Is Domain free of infrastructure?
- Is Application free of persistence?
- Is orchestration centralized?

IF architecture is SOUND:
- Proceed with cleanup only

IF architecture is PARTIALLY SOUND:
- Document weaknesses
- Do NOT redesign yet

============================================================
STEP 6 — DATA SEPARATION LAYER (CONDITIONAL)
============================================================

ONLY IF justified by existing code:

You MAY suggest introducing:
- Data Access / Persistence abstraction
- Repository interfaces
- Read/write separation

BUT:
- Do NOT implement unless minimal & safe
- Do NOT introduce new patterns
- Provide proposal, not enforcement

============================================================
STEP 7 — TEST SAFETY CHECK
============================================================

After refactor:
- Solution must build
- Tests must pass (if present)
- CLI behavior unchanged

============================================================
OUTPUT FORMAT (MANDATORY)
============================================================

Return a structured report:

1. Summary of changes
2. Deleted code list (with proof of non-usage)
3. Refactors performed (file-by-file)
4. Folder/naming changes
5. Comment cleanup summary
6. Architecture assessment
7. Data separation suggestion (if any)
8. Risks & rollback notes

============================================================
FINAL WARNING
============================================================

This refactor must be:
- Conservative
- Evidence-based
- Reversible

Incorrect deletion is worse than unused code.

When in doubt:
→ KEEP THE CODE.

END OF PROMPT
