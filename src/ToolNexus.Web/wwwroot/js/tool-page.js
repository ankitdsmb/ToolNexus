async function run() {
  const selectedAction = actionSelect?.value ?? '';

  if (!slug || !apiBase) {
    outputEditor.setValue('Tool configuration error.');
    return;
  }

  try {
    setRunningState(true);

    const response = await fetch(
      `${apiBase}/api/v1/tools/${encodeURIComponent(slug)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          input: inputEditor.getValue()
        })
      }
    );

    let result = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      let message = 'Tool execution failed.';

      if (response.status === 400) {
        message =
          result?.error ||
          result?.detail ||
          'Invalid request. Please verify the selected action and input.';
      } else if (response.status === 404) {
        message = result?.error || 'Tool not found.';
      } else if (response.status === 500) {
        message =
          result?.error ||
          result?.detail ||
          'Server error while running the tool.';
      } else {
        message =
          result?.error ||
          result?.detail ||
          `Request failed with status ${response.status}.`;
      }

      console.error('Tool execution failed', {
        status: response.status,
        slug,
        action: selectedAction,
        body: result
      });

      outputEditor.setValue(message);
      return;
    }

    outputEditor.setValue(
      result?.output ||
      result?.error ||
      'No output'
    );
  } catch (error) {
    console.error('Tool execution request crashed', {
      slug,
      action: selectedAction,
      error
    });

    outputEditor.setValue(
      'Unable to run tool due to a network or client error.'
    );
  } finally {
    setRunningState(false);
  }
}
