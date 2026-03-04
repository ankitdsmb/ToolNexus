export async function domPhase(context) {
  const result = await context.prepareDom(context);
  return {
    ...context,
    root: result?.root ?? context.root,
    ...result
  };
}
