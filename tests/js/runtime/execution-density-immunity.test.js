import fs from 'node:fs';
import path from 'node:path';

const siteCssPath = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/css/site.css');
const runtimeCssPath = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/css/tool-auto-professional.css');
const shellViewPath = path.resolve(process.cwd(), 'src/ToolNexus.Web/Views/Tools/ToolShell.cshtml');
const presentationEnginePath = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/js/runtime/tool-presentation-engine.js');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

describe('execution density immunity', () => {
  test('runtime min-height stays within execution bounds and avoids oversized vh sizing', () => {
    const css = read(siteCssPath);
    expect(css).toContain('min-height: clamp(540px, 60vh, 680px);');
    expect(css).not.toMatch(/min-height:\s*[^;]*7\dvh/);
  });

  test('editor workspace keeps aligned panel height and parity', () => {
    const css = read(runtimeCssPath);
    const bodyMinHeight = Number(css.match(/tool-local-body\)[\s\S]*?min-height:\s*(\d+)px;/)?.[1] ?? NaN);
    const minHeights = [...css.matchAll(/tool-local-surface[\s\S]*?min-height:\s*(\d+)px;/g)].map((match) => Number(match[1]));

    expect(Number.isFinite(bodyMinHeight)).toBe(true);
    expect(minHeights.length).toBeGreaterThan(0);
    expect(minHeights.every((height) => height >= 280 && height <= 340)).toBe(true);

    const min = Math.min(...minHeights);
    const max = Math.max(...minHeights);
    expect(max - min).toBeLessThanOrEqual(8);
    expect(bodyMinHeight - min).toBeLessThanOrEqual(40);
  });

  test('toolbar hierarchy keeps one primary and at most two secondary actions', () => {
    const engine = read(presentationEnginePath);
    expect(engine).toContain('secondaryNodes.filter(Boolean).slice(0, 2)');
  });

  test('status channel uses a single primary lifecycle status anchor', () => {
    const view = read(shellViewPath);
    const matches = view.match(/data-runtime-status-primary="true"/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  test('documentation is de-emphasized and secondary sections are collapsed by default', () => {
    const css = read(siteCssPath);
    const view = read(shellViewPath);

    expect(css).toContain('opacity: 0.72;');
    expect(view).toContain('<details class="runtime-doc-disclosure">');
    expect(view).not.toContain('<details class="runtime-doc-disclosure" open>');
  });

  test('css ownership contract remains separated between shell and tool-local selectors', () => {
    const siteCss = read(siteCssPath);
    const runtimeCss = read(runtimeCssPath);

    expect(siteCss).not.toMatch(/\.tool-local-/);
    expect(runtimeCss).not.toMatch(/\[data-tool-/);
  });
});
