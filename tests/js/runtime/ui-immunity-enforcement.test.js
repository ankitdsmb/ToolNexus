import fs from 'node:fs';
import path from 'node:path';

const siteCssPath = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/css/site.css');
const runtimeCssPath = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/css/tool-auto-professional.css');
const shellViewPath = path.resolve(process.cwd(), 'src/ToolNexus.Web/Views/Tools/ToolShell.cshtml');
const presentationEnginePath = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/js/runtime/tool-presentation-engine.js');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function toNumber(match) {
  return Number(match?.[1] ?? Number.NaN);
}

describe('ui immunity enforcement', () => {
  test('toolbar density keeps one primary action and at most two secondary actions', () => {
    const engine = read(presentationEnginePath);

    expect(engine).toContain("primaryActions.className = 'tn-unified-tool-control__actions-primary'");
    expect(engine).toContain("secondaryActions.className = 'tn-unified-tool-control__actions-secondary'");
    expect(engine).toContain('secondaryNodes.filter(Boolean).slice(0, 2)');
    expect(engine).toContain('primaryActions.replaceChildren(runButton, hintNode)');
  });

  test('panel alignment preserves immutable shell anchor order and grid mapping', () => {
    const css = read(siteCssPath);
    const view = read(shellViewPath);

    const requiredAnchors = [
      'data-tool-context="true"',
      'data-tool-status="true"',
      'data-tool-followup="true"',
      'data-tool-content-host="true"'
    ];

    for (const anchor of requiredAnchors) {
      expect(view).toContain(anchor);
    }

    expect(css).toContain('grid-template-areas:');
    expect(css).toContain('"context"');
    expect(css).toContain('"status"');
    expect(css).toContain('"followup"');
    expect(css).toContain('"content"');
    expect(css).toContain('.tool-shell-page__runtime > [data-tool-context="true"] { grid-area: context; }');
    expect(css).toContain('.tool-shell-page__runtime > [data-tool-status="true"] { grid-area: status; align-self: start; }');
    expect(css).toContain('.tool-shell-page__runtime > [data-tool-followup="true"] { grid-area: followup; align-self: start; }');
  });

  test('editor height balance preserves input/output parity without oversized variance', () => {
    const runtimeCss = read(runtimeCssPath);

    const bodyMinHeight = toNumber(runtimeCss.match(/tool-local-body\)[\s\S]*?min-height:\s*(\d+)px;/));
    const surfaceMinHeight = toNumber(runtimeCss.match(/tool-local-surface\)[\s\S]*?min-height:\s*(\d+)px;/));

    expect(Number.isFinite(bodyMinHeight)).toBe(true);
    expect(Number.isFinite(surfaceMinHeight)).toBe(true);

    expect(bodyMinHeight).toBeGreaterThanOrEqual(surfaceMinHeight);
    expect(bodyMinHeight - surfaceMinHeight).toBeLessThanOrEqual(40);
    expect(surfaceMinHeight).toBeGreaterThanOrEqual(280);
  });

  test('runtime spacing rules stay inside compact execution limits', () => {
    const siteCss = read(siteCssPath);
    const runtimeCss = read(runtimeCssPath);

    const runtimeGapLoose = toNumber(siteCss.match(/--exec-gap-loose:\s*(\d+)px;/));
    const runtimeGapNormal = toNumber(siteCss.match(/--exec-gap-normal:\s*(\d+)px;/));
    const runtimeGapTight = toNumber(siteCss.match(/--exec-gap-tight:\s*(\d+)px;/));

    expect(runtimeGapTight).toBeLessThanOrEqual(8);
    expect(runtimeGapNormal).toBeLessThanOrEqual(12);
    expect(runtimeGapLoose).toBeLessThanOrEqual(16);

    const toolGapLoose = toNumber(runtimeCss.match(/--exec-gap-loose:\s*(\d+)px;/));
    expect(toolGapLoose).toBeLessThanOrEqual(12);

    const workspaceBlock = siteCss.split('.tool-shell-page--workspace .tool-shell-page__runtime')[1] ?? '';
    const vhValues = [...workspaceBlock.matchAll(/min-height:\s*clamp\([^,]+,\s*(\d+)vh,/g)].map((m) => Number(m[1]));
    expect(vhValues.length).toBeGreaterThan(0);
    expect(vhValues.every((vh) => vh <= 64)).toBe(true);
  });

  test('css ownership violations are blocked between shell and tool-local styles', () => {
    const siteCss = read(siteCssPath);
    const runtimeCss = read(runtimeCssPath);

    expect(siteCss).not.toMatch(/\.tool-local-/);
    expect(runtimeCss).not.toMatch(/\[data-tool-/);
    expect(runtimeCss).not.toMatch(/\.tool-shell-page/);
  });
});
