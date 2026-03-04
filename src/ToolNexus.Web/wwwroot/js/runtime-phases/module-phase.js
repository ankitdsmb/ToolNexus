export async function modulePhase(context) {
  const result = await context.resolveModule(context);
  return {
    ...context,
    module: result?.module ?? context.module,
    lifecycle: result?.lifecycleContract ?? context.lifecycle,
    ...result
  };
}
