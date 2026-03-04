export async function manifestPhase(context) {
  const result = await context.resolveManifest(context);
  return {
    ...context,
    ...result
  };
}
