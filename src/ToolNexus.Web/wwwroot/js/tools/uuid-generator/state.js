import { UUID_LIMITS } from './helpers.js';

export function createInitialState() {
  return {
    version: 'v4',
    quantity: UUID_LIMITS.defaultQuantity,
    caseMode: 'lower',
    removeHyphens: false,
    wrapper: 'none',
    customTemplate: '',
    enforceUnique: false,
    autoGenerate: false,
    generating: false,
    lastGeneratedAt: null,
    generated: []
  };
}
