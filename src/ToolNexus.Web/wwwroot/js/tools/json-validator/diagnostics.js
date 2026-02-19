import { computeLineAndColumn } from './utils.js';

const POSITION_PATTERN = /position\s+(\d+)/i;
const TOKEN_PATTERN = /(Unexpected token[^\n.]*)/i;

export function analyzeJsonError(source, error) {
  const rawMessage = error instanceof Error ? error.message : 'Unable to parse JSON.';
  const positionMatch = rawMessage.match(POSITION_PATTERN);
  const tokenMatch = rawMessage.match(TOKEN_PATTERN);
  const position = positionMatch ? Number.parseInt(positionMatch[1], 10) : NaN;
  const { line, column } = computeLineAndColumn(source, Number.isFinite(position) ? position : 0);
  const explanation = tokenMatch ? tokenMatch[1] : rawMessage;

  return {
    title: 'Invalid JSON',
    explanation,
    line,
    column,
    position: Number.isFinite(position) ? position : 0
  };
}
