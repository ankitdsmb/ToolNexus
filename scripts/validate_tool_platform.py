#!/usr/bin/env python3
import json
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path('/workspace/ToolNexus')
WWW = ROOT / 'src/ToolNexus.Web/wwwroot'
TEMPLATE_DIR = WWW / 'tool-templates'
CSS_DIRS = [WWW / 'css/pages', WWW / 'css/tools']
JS_DIR = WWW / 'js/tools'
MANIFEST_DIR = ROOT / 'src/ToolNexus.Web/App_Data/tool-manifests'
SHELL_CSS = [WWW / 'css/site.css', WWW / 'css/ui-system.css']
FORBIDDEN_ANCHORS = [
    'data-tool-shell', 'data-tool-context', 'data-tool-status',
    'data-tool-followup', 'data-tool-input', 'data-tool-output'
]

def read(path: Path) -> str:
    try:
        return path.read_text(encoding='utf-8')
    except FileNotFoundError:
        return ''


def line_number(content: str, needle: str) -> int:
    idx = content.find(needle)
    if idx < 0:
        return 1
    return content.count('\n', 0, idx) + 1


def classify_density(min_height_issues, padding_issues, duplicate_headers, floating_actions, multiple_status):
    violations = sum(bool(x) for x in [min_height_issues, padding_issues, duplicate_headers, floating_actions, multiple_status])
    if violations >= 3:
        return 'EXECUTION LAW VIOLATION'
    if violations == 2:
        return 'NEEDS IMPROVEMENT'
    if violations == 1:
        return 'ACCEPTABLE'
    return 'PROFESSIONAL'


def parse_manifests():
    manifests = {}
    for path in sorted(MANIFEST_DIR.glob('*.json')):
        data = json.loads(read(path) or '{}')
        slug = data.get('slug') or path.stem
        manifests[slug] = {
            'path': path,
            'data': data,
            'template': data.get('templatePath', '').replace('/tool-templates/', ''),
            'module': data.get('modulePath', '').replace('/js/tools/', ''),
            'styles': [s.replace('/css/pages/', '').replace('/css/tools/', '') for s in data.get('styles', [])]
        }
    return manifests


def select_lines(text, pattern):
    lines = []
    for i, line in enumerate(text.splitlines(), start=1):
        if re.search(pattern, line):
            lines.append((i, line.strip()))
    return lines


def main():
    manifests = parse_manifests()
    results = []
    critical = []
    css_ownership = {'tool_css_touching_shell': [], 'shell_css_touching_tool': []}

    shell_css_cache = {p: read(p) for p in SHELL_CSS if p.exists()}

    for css_file in [p for d in CSS_DIRS for p in sorted(d.glob('*.css'))]:
        content = read(css_file)
        for i, line in select_lines(content, r'\[data-tool-(shell|context|status|followup|input|output)'):
            css_ownership['tool_css_touching_shell'].append((css_file, i, line))

    for shell_css_path, content in shell_css_cache.items():
        for i, line in select_lines(content, r'\.tool-local-'):
            css_ownership['shell_css_touching_tool'].append((shell_css_path, i, line))

    slugs = sorted(manifests.keys())
    for slug in slugs:
        manifest = manifests[slug]
        template_file = TEMPLATE_DIR / manifest['template'] if manifest['template'] else TEMPLATE_DIR / f'{slug}.html'
        js_file = JS_DIR / manifest['module'] if manifest['module'] else JS_DIR / f'{slug}.js'
        template = read(template_file)
        js = read(js_file)

        has_root = '<div class="tool-runtime-widget"' in template
        has_header = 'class="tool-local-header' in template
        has_actions = 'class="tool-local-actions' in template
        has_body = 'class="tool-local-body' in template
        has_metrics = 'class="tool-local-metrics' in template

        forbidden_hits = []
        for anchor in FORBIDDEN_ANCHORS:
            if anchor in template:
                ln = line_number(template, anchor)
                forbidden_hits.append((anchor, ln))

        nested_runtime = 'data-runtime-container' in template
        runtime_ln = line_number(template, 'data-runtime-container') if nested_runtime else None
        duplicate_headers = template.count('tool-local-header') > 1

        min_height_issues = []
        padding_issues = []
        floating_actions = []
        tool_css_hits = []

        style_files = []
        for s in manifest['styles']:
            if not s:
                continue
            page = WWW / 'css/pages' / s
            tool = WWW / 'css/tools' / s
            if page.exists():
                style_files.append(page)
            elif tool.exists():
                style_files.append(tool)

        for style_path in style_files:
            css = read(style_path)
            for m in re.finditer(r'min-height\s*:\s*(\d+)px', css):
                if int(m.group(1)) > 520:
                    ln = css.count('\n', 0, m.start()) + 1
                    min_height_issues.append((style_path, ln, m.group(0)))
            for m in re.finditer(r'padding(?:-[a-z]+)?\s*:\s*([^;]+);', css):
                values = re.findall(r'(\d+)px', m.group(1))
                if values and max(map(int, values)) > 32:
                    ln = css.count('\n', 0, m.start()) + 1
                    padding_issues.append((style_path, ln, m.group(0).strip()))
            for m in re.finditer(r'position\s*:\s*(fixed|sticky)', css):
                ln = css.count('\n', 0, m.start()) + 1
                floating_actions.append((style_path, ln, m.group(0)))
            for i, line in select_lines(css, r'\[data-tool-(shell|context|status|followup|input|output)'):
                tool_css_hits.append((style_path, i, line))

        multiple_status = len(re.findall(r'(tool-local-status|data-tool-status|status-)', template)) > 1

        runtime_has_init = bool(re.search(r'export\s+(async\s+)?function\s+init\s*\(', js))
        runtime_has_destroy = bool(re.search(r'export\s+function\s+destroy\s*\(', js))
        runtime_has_runtool = bool(
            re.search(r'export\s+(async\s+)?function\s+runTool\s*\(', js)
            or re.search(r'export\s*\{[^}]*\brunTool\b[^}]*\}', js, re.S)
        )
        mount_guard = 'MOUNT ONLY' in js or 'mount only' in js.lower()
        destroy_null_safe = 'if (!root)' in js or '?.destroy' in js or '?.' in js

        runtime_pass = all([runtime_has_init, runtime_has_destroy, runtime_has_runtool, destroy_null_safe])

        structure_pass = all([has_root, has_header, has_body]) and not forbidden_hits
        layout_pass = not tool_css_hits and not nested_runtime

        density = classify_density(min_height_issues, padding_issues, duplicate_headers, floating_actions, multiple_status)

        score = 100
        if not structure_pass:
            score -= 25
        if not layout_pass:
            score -= 20
        if density == 'ACCEPTABLE':
            score -= 8
        elif density == 'NEEDS IMPROVEMENT':
            score -= 18
        elif density == 'EXECUTION LAW VIOLATION':
            score -= 30
        if not runtime_pass:
            score -= 20

        score = max(score, 0)

        if not runtime_pass:
            missing = []
            if not runtime_has_init:
                missing.append('init export')
            if not runtime_has_destroy:
                missing.append('destroy export')
            if not runtime_has_runtool:
                missing.append('runTool export')
            if not destroy_null_safe:
                missing.append('null-safe destroy')
            critical.append((js_file, 1, f"Runtime safety contract missing: {', '.join(missing)}"))

        if forbidden_hits:
            for anchor, ln in forbidden_hits:
                critical.append((template_file, ln, f'Forbidden shell anchor `{anchor}` inside tool template'))
        if nested_runtime:
            critical.append((template_file, runtime_ln, 'Nested `data-runtime-container` detected'))
        if tool_css_hits:
            for style_path, ln, line in tool_css_hits:
                critical.append((style_path, ln, f'Tool CSS touches shell anchor selector: `{line}`'))

        results.append({
            'slug': slug,
            'structure': 'PASS' if structure_pass else 'FAIL',
            'layout': 'PASS' if layout_pass else 'FAIL',
            'density': density,
            'runtime': 'PASS' if runtime_pass else 'FAIL',
            'css': 'PASS' if not tool_css_hits else 'FAIL',
            'score': score,
            'details': {
                'has_actions': has_actions,
                'has_metrics': has_metrics,
                'mount_guard': mount_guard,
                'min_height_issues': min_height_issues,
                'padding_issues': padding_issues,
                'floating_actions': floating_actions,
                'forbidden_hits': forbidden_hits,
                'tool_css_hits': tool_css_hits
            }
        })

    for shell_css_path, ln, line in css_ownership['shell_css_touching_tool']:
        critical.append((shell_css_path, ln, f'Shell CSS touches tool-local selector: `{line}`'))

    global_score = round(sum(r['score'] for r in results) / len(results), 1) if results else 0
    architecture = 'PASS' if not critical else 'FAIL'

    report = []
    report.append('# TOOL PLATFORM VALIDATION REPORT\n')
    report.append(f'## GLOBAL SCORE (0–100)\n\n**{global_score}**\n')
    report.append('### PER TOOL RESULTS\n')
    for r in results:
        report.append(f"* **{r['slug']}** — structure: {r['structure']} | layout: {r['layout']} | density: {r['density']} | runtime safety: {r['runtime']} | css ownership: {r['css']}")

    report.append('\n### CRITICAL VIOLATIONS\n')
    if critical:
        for file, ln, msg in critical:
            rel = file.relative_to(ROOT)
            report.append(f'* `{rel}:{ln}` — {msg}')
    else:
        report.append('* None')

    report.append('\n### QUICK FIX ACTION PLAN\n')
    plan = [
        '1. Remove any shell anchor (`data-tool-*`) usage from tool templates; keep those anchors exclusively in ToolShell.',
        '2. Remove shell-anchor selectors from tool CSS (`css/pages/*`, `css/tools/*`) and scope styling to `.tool-runtime-widget`/`.tool-local-*` only.',
        '3. Remove `.tool-local-*` selectors from shell CSS (`site.css`, `ui-system.css`) and relocate to per-tool CSS where needed.',
        '4. Reduce editor/container `min-height` values over 520px and major container padding over 32px to improve execution density.',
        '5. Ensure each tool module exposes `init`, `destroy`, and `runTool`, with mount-only logic and null-safe destroy semantics.'
    ]
    report.extend(f'* {p}' for p in plan)

    report.append('\n### AUTO HEAL MODE\n')
    if critical:
        for file, ln, msg in critical:
            rel = file.relative_to(ROOT)
            report.append(f'* **Violation:** `{rel}:{ln}` — {msg}')
            if 'Runtime safety contract missing' in msg:
                report.append('  * **Why execution law fails:** runtime lifecycle contract is incomplete, so ToolShell cannot guarantee mount/execute/destroy safety.')
                report.append('  * **Minimal safe fix:** add missing `init`, `destroy`, or `runTool` exports in the existing module and keep execution logic inside `runTool` only.')
            else:
                report.append('  * **Why execution law fails:** ownership boundary is crossed between ToolShell and tool widget styles/contracts.')
                report.append('  * **Minimal safe fix:** move selector/anchor usage back to owning layer only; keep existing widget internals unchanged.')
    else:
        report.append('* No auto-heal actions required.')

    report.append('\n### ARCHITECTURE SAFETY RESULT\n')
    report.append(f'**{architecture}**\n')

    report.append('### CSS OWNERSHIP MATRIX\n')
    report.append('* **SHELL CSS OWNERSHIP:** `wwwroot/css/site.css`, `wwwroot/css/ui-system.css`')
    report.append('* **TOOL CSS OWNERSHIP:** `wwwroot/css/pages/*`, `wwwroot/css/tools/*`')
    report.append('* **Violations: Tool CSS → Shell anchors**')
    if css_ownership['tool_css_touching_shell']:
        for file, ln, line in css_ownership['tool_css_touching_shell']:
            rel = file.relative_to(ROOT)
            report.append(f'  * `{rel}:{ln}` selector `{line}`')
    else:
        report.append('  * None')
    report.append('* **Violations: Shell CSS → Tool internals**')
    if css_ownership['shell_css_touching_tool']:
        for file, ln, line in css_ownership['shell_css_touching_tool']:
            rel = file.relative_to(ROOT)
            report.append(f'  * `{rel}:{ln}` selector `{line}`')
    else:
        report.append('  * None')

    out = ROOT / 'reports/tool-platform-validation-report.md'
    out.write_text('\n'.join(report) + '\n', encoding='utf-8')

    print(f'Wrote {out}')
    print(f'Global score: {global_score} | Architecture safety: {architecture}')

if __name__ == '__main__':
    main()
