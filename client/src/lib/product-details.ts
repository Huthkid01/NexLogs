export function parseProductDetailLines(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function countProductDetailLines(value: string | null | undefined): number {
  return parseProductDetailLines(value).length;
}

export function joinProductDetailLines(lines: string[]): string {
  return lines.join('\n');
}

export function formatDeliveredProductDetails(lines: string[]): string {
  return lines.join('\n\n');
}
