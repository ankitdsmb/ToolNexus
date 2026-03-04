export async function recoveryPhase(context) {
  const result = await context.recoverRuntime(context);
  return {
    ...context,
    ...result
  };
}
