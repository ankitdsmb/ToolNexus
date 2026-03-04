import { validateToolSchema } from './schema-validator.js';
import { renderSchemaToolUi } from './schema-ui-generator.js';
import { runSchemaOperations } from './schema-operation-runner.js';

function resolveToolRoot(context) {
  if (context instanceof Element) {
    return context;
  }

  if (context?.handle?.root instanceof Element) {
    return context.handle.root;
  }

  if (context?.root instanceof Element) {
    return context.root;
  }

  return document.getElementById('tool-root');
}

async function loadSchema(slug, fetchImpl = fetch) {
  const response = await fetchImpl(`/tool-schemas/${encodeURIComponent(slug)}.json`, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Schema request failed (${response.status}) for "${slug}".`);
  }

  return response.json();
}

export function createSchemaToolModule({ slug, fetchImpl = fetch } = {}) {
  if (!slug) {
    throw new Error('Schema runtime requires a tool slug.');
  }

  const state = {
    slug,
    schema: null,
    ui: null,
    root: null,
    dispose: []
  };

  async function mount() {
    const rawSchema = await loadSchema(slug, fetchImpl);
    const validation = validateToolSchema(rawSchema, { expectedSlug: slug });
    if (!validation.valid) {
      throw new Error(`Invalid schema for "${slug}": ${validation.errors.join(' | ')}`);
    }

    state.schema = validation.schema;
    state.ui = renderSchemaToolUi(state.root, state.schema, {
      onRun: async () => {
        state.ui.setStatus('Running...');
        try {
          const inputs = {};
          for (const input of state.schema.inputs) {
            const control = state.ui.controls.get(input.name);
            inputs[input.name] = control?.value ?? '';
          }

          const resultState = runSchemaOperations(state.schema, inputs);
          for (const output of state.schema.outputs) {
            const control = state.ui.outputs.get(output.name);
            if (control) {
              control.value = String(resultState[output.name] ?? '');
            }
          }

          state.ui.setStatus('Completed');
        } catch (error) {
          state.ui.setStatus('Failed');
          throw error;
        }
      }
    });
  }

  return {
    create(context) {
      state.root = resolveToolRoot(context);
      if (!state.root) {
        throw new Error(`Schema runtime root not found for "${slug}".`);
      }

      const handle = {
        id: slug,
        root: state.root,
        init: async () => {
          await mount();
        },
        destroy: async () => {
          for (const dispose of state.dispose.splice(0)) {
            await dispose?.();
          }

          state.ui = null;
          state.schema = null;
        }
      };

      return handle;
    },
    async init(context) {
      const handle = this.create(context);
      await handle.init();
      return handle;
    },
    async destroy() {
      for (const dispose of state.dispose.splice(0)) {
        await dispose?.();
      }

      state.ui = null;
      state.schema = null;
    }
  };
}
