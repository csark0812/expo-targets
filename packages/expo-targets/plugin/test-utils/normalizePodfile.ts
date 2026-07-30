/**
 * Collapse a Podfile snippet's whitespace so structural comparisons in tests
 * don't break on indentation or blank-line differences.
 * Trims each line and drops empty lines entirely.
 */
export function normalizePodfile(content: string): string {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
