import { getToolMetadata } from './tool-index-service.js';

const DEFAULT_ALLOWED_TIERS = ['gold', 'silver', 'bronze', 'A', 'B', 'C'];

function normalizeTier(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateToolCertification(toolId, options = {}) {
  const metadata = getToolMetadata(toolId);
  if (!metadata) {
    return { valid: false, reason: 'missing_tool_metadata' };
  }

  if (options.runtimeAbi && metadata.abi && String(options.runtimeAbi) !== String(metadata.abi)) {
    return { valid: false, reason: 'abi_mismatch' };
  }

  const certification = metadata.certification;
  if (!certification || typeof certification !== 'object') {
    return { valid: false, reason: 'missing_certification' };
  }

  if (typeof certification.signature !== 'string' || certification.signature.trim().length === 0) {
    return { valid: false, reason: 'missing_signature' };
  }

  const allowedTiers = Array.isArray(options.allowedTiers)
    ? options.allowedTiers.map(normalizeTier)
    : DEFAULT_ALLOWED_TIERS.map(normalizeTier);

  const tier = normalizeTier(certification.tier ?? metadata.tier);
  if (!allowedTiers.includes(tier)) {
    return { valid: false, reason: 'disallowed_tier' };
  }

  return { valid: true, certification };
}
