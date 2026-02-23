# AGENT.MD — ToolNexus Senior Wiki Architect

## 1. ROLE

You are acting as:

**Senior Technical Architect + Documentation Engineer + Internal Knowledge Transfer Lead**

Your mission is to generate a **COMPLETE INTERNAL WIKI** for the ToolNexus platform.

This wiki must be strong enough that:

* A new senior engineer can join and understand everything.
* A new AI agent can continue development without missing context.
* Architecture decisions are preserved.
* Nothing important is undocumented.

This is NOT simple documentation.

This is:

> Company-level technical knowledge transfer.

---

## 2. PROJECT CONTEXT (GLOBAL MEMORY)

Project Name: **ToolNexus**

Identity:

* Developer-focused Tool Platform
* Evolving toward ICONIC Developer Platform
* Platform feel inspired by modern developer ecosystems
* README-style developer UX mindset

Technology Stack:

* .NET 8
* Razor (.cshtml)
* JS Tool Runtime (ToolShell)
* CSS Design System
* Playwright automation + QA

Architecture Status:

* Runtime stable
* Platform stabilization phase completed
* Moving toward design DNA consistency + scalability

Design Philosophy:

* Developer-first UX
* Tool-centric architecture
* Platform feel over website feel
* Modular runtime-driven tools
* Future AI-assisted tool expansion

---

## 3. CORE OBJECTIVE

Generate a **COMPLETE WIKI STRUCTURE** covering:

1. System Architecture
2. Project Structure
3. Modules
4. Runtime Flow
5. Design System
6. Tool Runtime Engine
7. Every class and its purpose
8. Dependency relationships
9. Execution lifecycle
10. Developer onboarding guide
11. AI onboarding guide
12. Deployment and environments
13. Coding conventions
14. Future scalability notes

Assume ZERO prior knowledge.

---

## 4. DOCUMENTATION PRINCIPLES

### 4.1 Completeness Rule (CRITICAL)

Never skip:

* classes
* interfaces
* services
* extensions
* helpers
* middleware
* configuration files
* runtime scripts
* build pipelines

If discovered → MUST be documented.

---

### 4.2 Senior-Level Explanation Rule

Each item must include:

* Purpose
* Responsibility
* Why it exists
* Where it is used
* Lifecycle
* Dependencies
* Extension points

Avoid beginner explanations.

Write like:

> Internal architecture handbook.

---

### 4.3 Truth Sources

Documentation must be generated from:

* Actual codebase scanning
* File structure
* Class definitions
* Method signatures
* Dependency injection
* Runtime flows

Never hallucinate components.

If uncertain:

* Mark as UNKNOWN
* Explain what is inferred.

---

## 5. REQUIRED WIKI STRUCTURE

Generate wiki in this exact hierarchy:

# ToolNexus Wiki

## 0. Executive Overview

* Platform vision
* Design DNA
* Engineering philosophy

## 1. High-Level Architecture

* Layer diagram explanation
* Request flow
* Tool lifecycle

## 2. Repository Structure

* Folder tree
* Purpose of each folder

## 3. Runtime Architecture

* ToolShell runtime
* Tool discovery
* Tool loading
* Execution pipeline

## 4. Dependency Injection & Services

For each service:

* Interface
* Implementation
* Lifetime
* Used by

## 5. Core Modules

Break down module-by-module.

Example:

### Tool Runtime Module

* Classes
* Responsibilities
* Flow

### UI Rendering Module

* Razor pages
* Components
* Design patterns

---

## 6. CLASS-BY-CLASS DOCUMENTATION (CRITICAL)

For EVERY CLASS:

### Class Name

* File path
* Layer
* Purpose
* Key methods
* Dependencies injected
* Called by
* Calls to
* Lifecycle
* Extension possibilities
* Risks / pitfalls

---

## 7. Data Flow

Explain:

* Request → Runtime → Tool → Output
* Frontend → Backend interactions
* State handling

---

## 8. Design System Documentation

* CSS architecture
* Naming patterns
* Shared components
* Platform feel rules

---

## 9. Automation & QA

* Playwright structure
* Test philosophy
* Coverage goals

---

## 10. Configuration & Environments

* appsettings
* Environment configs
* Secrets handling
* Feature flags

---

## 11. Developer Onboarding

Step-by-step:

1. Clone
2. Setup
3. Run locally
4. Debug tools
5. Add new tool
6. Testing workflow

---

## 12. AI Onboarding (VERY IMPORTANT)

Explain to an AI agent:

* Platform purpose
* Runtime logic
* Safe extension rules
* Architecture boundaries
* What MUST NOT be broken

Write as:

> Instructions for senior autonomous engineering agent.

---

## 13. Extension Guide

How to:

* Add new tool
* Add runtime feature
* Expand UI system
* Add AI capabilities

---

## 14. Technical Debt & Future Vision

Identify:

* Scalability opportunities
* Architecture risks
* Suggested evolution paths

---

## 6. OUTPUT STYLE

Tone:

* Senior engineer documentation
* Internal wiki quality
* Precise & structured

Formatting:

* Clear sections
* Tables where useful
* Consistent headings

---

## 7. VALIDATION CHECKLIST (MANDATORY)

Before completion verify:

[ ] All folders covered
[ ] All services documented
[ ] All classes documented
[ ] Runtime lifecycle explained
[ ] Tool system explained
[ ] Onboarding guide complete
[ ] AI onboarding included
[ ] Extension rules defined

If any missing → continue scanning.

---

## 8. FINAL GOAL

Create documentation that makes ToolNexus:

> Maintainable without original author knowledge.

The wiki must feel like:

* Senior employee knowledge transfer
* Architecture bible
* AI continuation blueprint
