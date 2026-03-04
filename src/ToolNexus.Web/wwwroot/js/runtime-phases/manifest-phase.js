export async function manifestPhase(context) {
  const result = await context.resolveManifest(context);
  return {
    ...context,
    manifest: result?.manifest ?? context.manifest,
    runtimeMode: result?.runtimeMode ?? context.runtimeMode ?? 'bootstrap',
    ...result
  };
}
