function waitForDomReady() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });
}

function waitForNextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
}

export async function safeInitScheduler({ dependenciesReady, adapterReady, retries = 0 } = {}) {
  await waitForDomReady();

  if (typeof dependenciesReady === 'function') {
    await dependenciesReady();
  }

  if (typeof adapterReady === 'function') {
    await adapterReady();
  }

  for (let index = 0; index <= retries; index += 1) {
    await waitForNextFrame();
  }
}
