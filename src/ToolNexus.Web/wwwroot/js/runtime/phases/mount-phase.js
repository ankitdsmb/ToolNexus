export async function mountPhase(context) {
  const result = await context.mountLifecycle(context);
  return {
    ...context,
    lifecycle: result?.lifecycle ?? context.lifecycle,
    ...result
  };
}
