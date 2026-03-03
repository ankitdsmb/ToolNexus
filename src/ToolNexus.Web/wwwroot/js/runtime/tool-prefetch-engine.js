const prefetchedToolSlugs = new Set();

export async function prefetchToolModule(slug) {
  if (!slug || prefetchedToolSlugs.has(slug)) {
    return;
  }

  try {
    await import(`/js/tools/${slug}.js`);
    prefetchedToolSlugs.add(slug);
  } catch (error) {
    console.warn('[tool-prefetch-engine] Failed to prefetch tool module.', {
      slug,
      message: error?.message ?? String(error)
    });
  }
}
