# Tool Page UX Behavior

## Interaction Rules
- **Run button enablement**: The Run button is disabled unless the input editor contains non-whitespace text.
- **Keyboard shortcut**: `Ctrl+Enter` (or `Cmd+Enter` on macOS) triggers execution from the input editor.
- **Loading state**: While the API call is in progress, the Run button marks `aria-busy="true"` and a spinner is displayed.

## Result + Status Feedback
- **Result indicator** shows one of: `Waiting for execution`, `Running tool...`, `Execution succeeded`, `Execution failed`.
- **Empty state** appears before first execution and instructs users to run the tool.
- **Error display** uses a dedicated alert container with `role="alert"` and assertive live announcements.
- **Output display** appears after execution and can contain either response output or the user-facing failure message.

## Convenience Actions
- **Copy output** copies current output to clipboard and raises a toast.
- **Download output** saves output as `<slug>-output.txt` and raises a toast.
- Empty copy/download attempts produce warning toasts.

## Accessibility Considerations
- Added ARIA live regions for:
  - inline errors (`role="alert"`, `aria-live="assertive"`),
  - result state (`role="status"`, `aria-live="polite"`),
  - toasts (`aria-live="polite"`, `aria-atomic="true"`).
- Interaction controls are native `<button>` / `<select>` elements to preserve keyboard tab navigation.
- Input editor is associated with shortcut helper text using `aria-describedby`.
