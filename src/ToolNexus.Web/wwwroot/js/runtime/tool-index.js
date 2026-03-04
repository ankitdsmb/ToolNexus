export {
  __resetToolIndexServiceForTests as __resetToolIndexForTests,
  getToolMetadata,
  loadToolIndex,
  resolveRoute,
  resolveTool
} from './tool-index-service.js';

import { resolveTool } from './tool-index-service.js';

export function resolveToolModule(toolId) {
  return resolveTool(toolId)?.module ?? null;
}
