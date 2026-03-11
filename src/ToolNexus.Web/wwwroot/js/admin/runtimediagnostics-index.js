const runtime = window.ToolNexusRuntime;
    const diagnostics = runtime?.getDiagnostics?.() ?? {};

    document.getElementById('runtimeIdentity').textContent = JSON.stringify(window.ToolNexusRuntimeIdentity ?? {}, null, 2);
    document.getElementById('mountedTools').textContent = JSON.stringify(diagnostics.registry ?? {}, null, 2);
    document.getElementById('fallbackUsage').textContent = String((diagnostics.legacyAdapterUsage ?? 0) > 0);
    document.getElementById('runtimeErrors').textContent = JSON.stringify(diagnostics.lastError ?? [], null, 2);

    document.getElementById('toggleStrictMode')?.addEventListener('click', () => {
        window.ToolNexusRuntime = window.ToolNexusRuntime || {};
        window.ToolNexusRuntime.strict = !window.ToolNexusRuntime.strict;
        alert(`ToolNexusRuntime.strict = ${window.ToolNexusRuntime.strict}`);
    });
