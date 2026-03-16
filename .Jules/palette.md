# Palette's Journal

## 2026-05-18 - Platform Feel Integration
**Learning:** The codebase has a centralized `tool-shell-feel.js` that implements a platform-wide "acknowledged" state (`is-acknowledged`) for buttons, providing a short tactile animation. However, older tool pages (`tool-page.js`) don't consistently trigger this visual feedback or provide immediate inline labels (like "Copied!") for critical actions, relying solely on global toasts.
**Action:** When implementing button feedback, always check for existing animation classes like `is-acknowledged` and ensure they are paired with temporary label changes to reduce cognitive load during quick "run-copy-share" workflows.

## 2026-05-18 - Safe DOM Manipulation & Icons
**Learning:** Platform-wide styles often inject icons (via `<i>` or `<svg>`) into buttons. Using `.textContent` to provide quick feedback (like "Copied!") on the button itself will wipe out these child elements if the button doesn't have a dedicated label span.
**Action:** Always target a specific `.tool-btn__label` class for text swaps. If it doesn't exist, fallback to animation-only feedback (like `is-acknowledged`) and `aria-label` updates to preserve the visual integrity of the design system's icons.
