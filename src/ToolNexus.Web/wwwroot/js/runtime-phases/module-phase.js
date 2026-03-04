export async function modulePhase(context) {
  const result = await context.resolveModule(context);
  return {
    ...context,
    ...result
  };
}
