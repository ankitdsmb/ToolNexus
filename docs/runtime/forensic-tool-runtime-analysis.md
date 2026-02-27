# Tool Runtime Forensic Analysis (Stabilization Pass)

## 1) Actual lifecycle graph (code-observed)

```text
bootstrapToolRuntime()
  -> safeLoadManifest()
  -> safeDomMount()
  -> safeLoadTemplate()
  -> templateBinder()
  -> ensureDomContract() pre-mount
  -> safeLoadDependencies()
  -> safeResolveLifecycle() + inspectLifecycleContract()
  -> lifecycleAdapter(mountToolLifecycle)
     -> mountNormalizedLifecycle()
        -> normalizeToolExecution().create()
        -> normalizeToolExecution().init()
  -> validateDomAtPhase() post-mount
  -> detectToolClassification()
  -> emit('mount_success')
```

Evidence:
- Runtime orchestration is implemented in `safeMountTool` and `safeMount` inside `tool-runtime.js`.
- Lifecycle adapter path is `mountToolLifecycle -> mountNormalizedLifecycle -> normalizeToolExecution`.

## 2) Root ownership flow diagram

```text
tool-runtime root (Element #tool-root)
  -> lifecycleAdapter({ root, context, manifest })
    -> normalizeToolExecution(..., { root, context })
      -> target.create(root, manifest, context)
      -> target.init(lifecycleContext, root, manifest, context)
         (retry path: target.init(root, manifest, context) for root-first init signatures)
      -> tool-platform-kernel.registerTool({ root | {root} | {toolRoot} | execution context })
         -> normalizeToolRootInput(...)
         -> ensureRootId(normalizedRoot)
         -> createToolKey(id, normalizedRoot)
```

Ownership invariant after fix: kernel APIs (`registerTool`, `ensureRootId`, `createToolKey`) normalize to a DOM `Element` before any `dataset` access.

## 3) Kernel responsibilities (actual)

The kernel is responsible for:
- root normalization from execution context/object wrappers,
- assigning/stabilizing `data-tool-root-id`,
- id+root lifecycle identity keying,
- stateful init/destroy tracking per mount root.

Stabilization changes keep this in the kernel (platform-level), not in individual tools.

## 4) Tool responsibilities (actual)

Tools are expected to:
- expose lifecycle contract (`create/init/destroy`) for mount lifecycle,
- register through kernel with a mount root,
- avoid forcing legacy paths during lifecycle mount.

For audited tools (`json-formatter`, `json-validator`, `xml-formatter`, `csv-viewer`, `regex-tester`), lifecycle mounting now succeeds under modern runtime classification.

## 5) Why failure occurred (single source of truth)

Primary root cause:

> The execution normalizer auto-invoked `runTool()` during modern lifecycle `init()` whenever a module exposed both lifecycle methods and a `runTool` function.

This violated lifecycle semantics because `runTool(action, input, ...)` APIs were being called with lifecycle arguments (`context/root/manifest`) during mount, producing deterministic runtime crashes and fallback/compatibility signals.

Secondary platform issue:
- Kernel root normalization was incomplete across context shapes for some lifecycle call paths.
- Compatibility telemetry was over-reported for any normalized result, even when lifecycle mode was modern.

## 6) Exact culprit lines (file + line)

### Historical culprit patterns fixed
1. `tool-execution-normalizer.js`
   - Modern lifecycle path was invoking `target.runTool(...)` after `target.init(...)`.
2. `tool-platform-kernel.js`
   - Root normalization did not cover all execution-context root carrier shapes.
   - Error path was not consistently fail-fast with a single invalid-root marker.
3. `tool-runtime.js`
   - Compatibility event emission keyed off `result.normalized` (too broad), not lifecycle mode.
   - Strict DOM root guard assertion applied regardless of lifecycle mode, causing false failures in non-contract fallback paths.

## 7) Before vs after behavior

Before:
- Modern lifecycle tools with `runTool` APIs could execute runtime action code during mount.
- Tools with context-wrapped roots could fail kernel root checks.
- Compatibility telemetry was emitted for modern normalized lifecycle.

After:
- Modern lifecycle mount calls only `create/init/destroy` and does not auto-run execution APIs.
- Kernel normalization resolves Element roots from `{root}`, `{toolRoot}`, nested `context`, `executionContext`, `instance`, and `runtime` wrappers.
- Compatibility mode telemetry only emits for true legacy/window lifecycle modes.
- Required audited tools mount cleanly with modern runtime path.

## 8) Runtime invariants (must never break)

1. Lifecycle mount must never execute business `runTool(action,input)` implicitly.
2. Kernel root identity functions must operate only on normalized `Element` roots.
3. `data-tool-root-id` assignment must occur only after root type validation.
4. Compatibility telemetry must reflect actual legacy mode usage, not generic normalization.
5. DOM contract post-mount must be validated after lifecycle mount in resolved validation scope.

## 9) Regression risks

- Reintroducing `runTool` auto-invocation in modern lifecycle will recreate mount-time action crashes.
- Adding new root-carrying execution context shapes without kernel normalization updates may reintroduce invalid-root failures.
- Over-broad compatibility event conditions will pollute runtime diagnostics and obscure true legacy bridge use.

## 10) Future enforcement rules

1. Keep mount semantics strict: `create/init/destroy` only.
2. Add/maintain tests for root normalization inputs at kernel boundaries.
3. Keep compatibility telemetry mode-gated (`legacy*` / `window.*` only).
4. When adding tool modules, lifecycle init must accept context-first and root-first safely where possible.
5. Keep audited runtime stabilization test (`required-tools-runtime-stabilization.test.js`) in CI as a minimum mount contract for critical tools.
