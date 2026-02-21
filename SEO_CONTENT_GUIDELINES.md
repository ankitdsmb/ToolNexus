# SEO_CONTENT_GUIDELINES

## SEO Architect x Content Writer alignment memo

### 1) Human tone rules (anti-robotic baseline)
- Write like a senior engineer explaining a practical workflow to another engineer.
- Prefer concrete verbs and outcomes (“format payloads before code review”), not abstract claims.
- Keep sentence rhythm varied; avoid repetitive “This tool helps you…” openings.
- Use plain language first, then precise technical terms where useful.
- Avoid generic superlatives (“best”, “ultimate”, “revolutionary”) unless evidence is present.

### 2) Non-AI robotic writing constraints
- Ban filler templates and keyword stuffing patterns.
- Avoid repeating exact target keyword in every heading.
- Each section must add new intent value:
  - problem framing
  - execution steps
  - validation/edge cases
  - next-step internal links
- Keep examples realistic (logs, API payloads, config snippets) and short.

### 3) Conversion-focused structure
Recommended order for tool-oriented pages:
1. **Outcome-first opener** (what user gets in 1 sentence).
2. **When to use this** (3–5 high-intent scenarios).
3. **How to run it** (step sequence; skim-friendly).
4. **Examples** (input/output pairs).
5. **Common mistakes + fixes**.
6. **Related tools / next action** (internal linking).
7. **FAQ for objections** (speed, privacy, accuracy, limits).

CTA style:
- Actionable and contextual (“Try JSON Formatter with a sample payload”).
- No hard-sell language; focus on reducing workflow friction.

### 4) Readability hierarchy
- One clear `h1` per page.
- Organize with `h2` for major intent clusters, `h3` for substeps.
- Use short paragraphs (1–3 sentences) and bullets for procedures.
- Ensure each section can be understood independently in SERP-to-scroll behavior.

### 5) SEO + UX quality bar
- Match content to route intent:
  - TYPE A: trust/legal/brand clarity.
  - TYPE B: discoverability + category disambiguation.
  - TYPE C: task completion + troubleshooting.
- Preserve factual privacy/security statements; do not introduce unverifiable claims.
- Keep internal links relevant and limited (quality > volume).

### 6) Accessibility-aware content behavior
- Descriptive headings; avoid vague labels like “More info”.
- Link text should describe destination intent.
- Avoid giant paragraph walls; chunk for screen-reader and scan usability.
- Use tables only where comparative data is genuinely easier to parse.

### 7) Editorial guardrails for future phases
- Content changes must not alter runtime selectors or mount nodes.
- SEO blocks should be append-only in designated safe zones unless contract migration is planned.
- New FAQs should be semantically grouped and, where applicable, mirrored in JSON-LD strategy.
