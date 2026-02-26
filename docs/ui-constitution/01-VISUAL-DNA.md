# ToolNexus UI Constitution — Visual DNA

This document defines the immutable ToolNexus UI structure.

It is structural only and does not define CSS or styling implementation details.

## 1. Permanent Layout Zones

The global ToolNexus workspace layout is permanently composed of the following zones, in this order:

1. **HEADER**
2. **CONTEXT STRIP**
3. **LEFT INPUT PANEL**
4. **RIGHT OUTPUT PANEL**
5. **FOLLOW-UP ACTION BAR**

These zones are the required platform skeleton for all tools running within ToolNexus.

## 2. Immutable Layout Rules

The following rules are non-negotiable:

- Tools cannot change layout.
- Layout never shifts during execution.
- Execution visibility is always present.

Only runtime content and state data may update within the fixed structure.

## 3. Workspace Ratio Guidelines

Within the workspace split:

- **Left Input Panel:** 38–42%
- **Right Output Panel:** 58–62%

These ratios preserve the execution-first model where configuration remains compact and output/telemetry remains primary.

## 4. Stability During Execution

Configuration UI must not move during run.

During execution, interaction states may update, but structural placement must remain stable.
