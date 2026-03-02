import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const siteCss = readFileSync('src/ToolNexus.Web/wwwroot/css/site.css', 'utf8');
const uiCss = readFileSync('src/ToolNexus.Web/wwwroot/css/ui-system.css', 'utf8');
const toolCss = readFileSync('src/ToolNexus.Web/wwwroot/css/tool-auto-professional.css', 'utf8');
const jsonCss = readFileSync('src/ToolNexus.Web/wwwroot/css/pages/json-formatter.css', 'utf8');
const shellView = readFileSync('src/ToolNexus.Web/Views/Tools/ToolShell.cshtml', 'utf8');

describe('execution density immunity contract', () => {
  it('keeps shell runtime height and spacing compact', () => {
    expect(siteCss).toContain('min-height: clamp(620px, 68vh, 840px);');
    expect(uiCss).toContain('--exec-gap-tight');
    expect(uiCss).toContain('--exec-gap-normal');
    expect(uiCss).toContain('"context"\n    "status"\n    "followup"\n    "content";');
  });

  it('keeps toolbar and editor workspace dense and balanced', () => {
    expect(siteCss).toContain('gap: var(--space-1);');
    expect(siteCss).toContain('min-height: 400px;');
    expect(toolCss).toContain('gap: var(--exec-gap-tight);');
  });

  it('keeps docs secondary and execution-first by default', () => {
    expect(shellView).toContain('data-doc-priority="@(isPrimaryDocSection ? "primary" : "secondary")"');
    expect(shellView).toContain('tool-shell-page--workspace');
  });

  it('prevents css ownership overlap between shell and tool layers', () => {
    expect(siteCss).not.toMatch(/\.tool-local-/);
    expect(toolCss).not.toMatch(/\[data-tool-/);
  });
});
