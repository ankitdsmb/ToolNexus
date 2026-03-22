## 2025-05-22 - [Command Palette Accessibility and UX]
**Learning:** In the ToolNexus CSS system, component classes (like `.command-palette__clear`) that define a `display` value (e.g., `flex`) override the default browser behavior of the `hidden` HTML attribute.
**Action:** Always include `.class[hidden] { display: none; }` in component-specific CSS to ensure elements are hidden when the `hidden` property is set.

**Learning:** When using modal dialogs, keyboard-only users can lose focus into the background page if a focus trap is not explicitly implemented.
**Action:** Use a `Tab` key listener in the modal's `onKeydown` handler to wrap focus between the first and last focusable elements within the dialog.
