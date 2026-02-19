export function normalizeSqlInput(input) {
  return (input ?? '').replace(/\r\n?/g, '\n');
}
