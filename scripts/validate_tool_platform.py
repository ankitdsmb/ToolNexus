#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WEBROOT=ROOT/'src/ToolNexus.Web/wwwroot'
MANIFEST_DIR=ROOT/'src/ToolNexus.Web/App_Data/tool-manifests'
ANCHOR_SELECTOR=re.compile(r'[^\n{]*data-tool-(?:shell|context|status|followup|input|output)[^\n{]*\{')

manifests=sorted(MANIFEST_DIR.glob('*.json'))
ids=[json.loads(m.read_text()).get('id',m.stem) for m in manifests]
results={i:{'structure':'PASS','layout':'PASS','density':'PROFESSIONAL','runtime':'PASS','css':'PASS'} for i in ids}
critical=[]
fixes=[]

def note(tool,msg):
    critical.append(msg)
    if tool in results: results[tool]['layout']='FAIL'

for tool in ids:
    t=(WEBROOT/'tool-templates'/f'{tool}.html')
    if not t.exists():
        results[tool]['structure']='FAIL'; critical.append(f'{t}: template missing'); continue
    c=t.read_text()
    for req in ['tool-runtime-widget','tool-local-header','tool-local-body']:
        if req not in c:
            results[tool]['structure']='FAIL'; critical.append(f'{t}: missing {req}')
    for anchor in ['data-tool-shell','data-tool-context','data-tool-status','data-tool-followup','data-tool-input','data-tool-output']:
        if anchor in c:
            results[tool]['structure']='FAIL'; results[tool]['layout']='FAIL'; critical.append(f'{t}: illegal shell anchor {anchor}')

for tool in ids:
    density_issues=[]
    for css_file in [WEBROOT/'css/pages'/f'{tool}.css', WEBROOT/'css/tools'/f'{tool}.css']:
        if not css_file.exists():
            continue
        css=css_file.read_text()
        for sel in ANCHOR_SELECTOR.findall(css):
            results[tool]['css']='FAIL'; results[tool]['layout']='FAIL'; critical.append(f'{css_file}: selector `{sel.strip()}` touches shell anchors')
        for v in re.findall(r'min-height\s*:\s*(\d+)px',css):
            if int(v)>520: density_issues.append(f'{css_file}: min-height {v}px exceeds 520px')
        for v in re.findall(r'padding\s*:\s*(\d+)px',css):
            if int(v)>32: density_issues.append(f'{css_file}: padding {v}px exceeds 32px')
    if density_issues:
        results[tool]['density']='ACCEPTABLE' if len(density_issues)<3 else 'NEEDS IMPROVEMENT'
        critical.extend(density_issues)

for shell_css in [WEBROOT/'css/site.css', WEBROOT/'css/ui-system.css']:
    if shell_css.exists() and '.tool-local-' in shell_css.read_text():
        critical.append(f'{shell_css}: shell CSS targets .tool-local-* internals')
        for tool in ids: results[tool]['layout']='FAIL'

for tool in ids:
    js=WEBROOT/'js/tools'/f'{tool}.js'
    if not js.exists():
        results[tool]['runtime']='FAIL'; critical.append(f'{js}: runtime module missing'); continue
    s=js.read_text()
    if 'data-runtime-container' in s:
        results[tool]['runtime']='FAIL'; critical.append(f'{js}: nested data-runtime-container detected')
        fixes.append(f'{tool}: remove nested runtime container injection and bind to template nodes.')
    has_run_tool_export = ('export async function runTool' in s or 'export function runTool' in s or re.search(r'export\s*\{[^}]*\brunTool\b', s, re.S) is not None)
    if 'export function mount' in s and not has_run_tool_export:
        results[tool]['runtime']='FAIL'; critical.append(f'{js}: mount lifecycle without exported runTool')
        fixes.append(f'{tool}: expose runTool and keep mount for event wiring only.')

score=max(0,100-(len(critical)*2))
arch='FAIL' if any('FAIL' in r.values() for r in results.values()) else 'PASS'

out=['# TOOL PLATFORM VALIDATION REPORT','','## GLOBAL SCORE (0–100)','',f'**{score}**','','### PER TOOL RESULTS','']
for tool in sorted(ids):
    r=results[tool]
    out += [f'* **{tool}**',f'  * structure pass/fail: {r["structure"]}',f'  * layout pass/fail: {r["layout"]}',f'  * density rating: {r["density"]}',f'  * runtime safety: {r["runtime"]}',f'  * css ownership: {r["css"]}']
out += ['', '### CRITICAL VIOLATIONS','']
out += [f'* {c}' for c in critical] if critical else ['* None']
out += ['', '### QUICK FIX ACTION PLAN','']
if fixes:
    for i,f in enumerate(dict.fromkeys(fixes),1): out.append(f'{i}. {f}')
else:
    out.append('1. Keep validator in CI and rerun on every widget/template/CSS change.')
out += ['', '### ARCHITECTURE SAFETY RESULT','',arch,'']
report=ROOT/'docs/reports/TOOL-PLATFORM-VALIDATION-REPORT.md'
report.write_text('\n'.join(out))
print(f'Wrote {report}')
print(f'GLOBAL SCORE: {score}')
print(f'ARCHITECTURE SAFETY RESULT: {arch}')
