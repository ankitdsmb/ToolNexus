# AGENTS.md — ToolNexus Admin Platform Governance

## PURPOSE

This repository is building:

ToolNexus Admin Platform

Goal:

* Production-grade admin panel
* Built using lightweight proven admin template
* NO custom UI framework reinventing
* Focus on functionality, scalability, and operator efficiency.

---

# CORE PRINCIPLES

1. Architecture First

* Analyze before implementation.
* Avoid unnecessary rewrites.

2. Template-first Development

* Use a lightweight popular admin template.
* Prefer:

  * Tabler
  * AdminLTE (modern minimal usage)
  * CoreUI
  * or similar lightweight Bootstrap-based system.

DO NOT create custom design system from scratch.

---

# ADMIN DESIGN RULES

* Clean dashboard layout.
* Fast loading.
* Keyboard-friendly workflows.
* CRUD-heavy views optimized for productivity.

Admin is for operators, not marketing.

---

# PHASED EXECUTION MODEL

Every task MUST follow:

Phase 1 — Architecture Analysis (NO CODE)
Phase 2 — Template Integration
Phase 3 — Admin Shell Layout
Phase 4 — Tool Management (Dynamic Core)
Phase 5 — Content Management
Phase 6 — Execution Control
Phase 7 — Analytics + Logs
Phase 8 — Security / Roles
Phase 9 — Feature Flags
Phase 10 — Hardening + QA

---

# DYNAMIC TOOL SYSTEM (MANDATORY)

Tools must be fully dynamic.

Admin must support:

* Add tool without code change.
* Edit input schema.
* Edit output schema.
* Enable / disable.
* Categorization.
* Version-safe publishing.

NEVER hardcode tools in UI.

---

# DATABASE RULES

Admin interacts with existing EF Core models.

DO NOT:

* create parallel storage
* duplicate tool structures.

Reuse ToolNexus entities.

---

# API RULES

Admin uses same backend APIs.

Add:

/api/admin/*

Only when needed.

Avoid separate admin backend.

---

# SECURITY RULES

RBAC Required:

* Admin
* Editor
* Viewer
* Developer

No anonymous admin access.

---

# REQUIRED FEATURES

1. Dashboard Overview
2. Tool Management
3. Tool Content Editor
4. Categories Manager
5. Tool Execution Config
6. Feature Flags
7. Analytics
8. Logs Viewer
9. User Roles
10. Global Settings

---

# PERFORMANCE RULES

Admin UI must:

* avoid heavy JS frameworks unless required.
* support server-rendered pages when possible.

---

# REPORTING FORMAT (MANDATORY)

Each phase must output:

* Architecture impact summary
* Files modified
* Testing done
* Risks
* Confidence score

---

# FORBIDDEN

* Rebuilding admin UI framework.
* Breaking existing frontend.
* Hardcoding tool logic.
* Skipping phases.

---

# EXECUTION ORDER

ANALYZE → PLAN → IMPLEMENT → TEST → VERIFY → REPORT

END OF FILE
