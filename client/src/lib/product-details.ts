export const PRODUCT_DETAIL_DELIMITER = '<<<ITEM>>>';

const NUMBERED_LINE_PATTERN = /^\s*\d+[\.\)\]:\-]\s*/;

function parseLegacyLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseNumberedBlocks(value: string): string[] {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const items: string[] = [];
  let current: string[] = [];

  const pushCurrent = () => {
    const text = current.join('\n').trim();
    if (text) items.push(text);
    current = [];
  };

  for (const line of lines) {
    if (NUMBERED_LINE_PATTERN.test(line)) {
      pushCurrent();
      current.push(line.replace(NUMBERED_LINE_PATTERN, '').trimEnd());
      continue;
    }

    if (!line.trim()) {
      if (current.length > 0) pushCurrent();
      continue;
    }

    current.push(line.trimEnd());
  }

  pushCurrent();
  return items;
}

export function parseProductDetailLines(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];

  const trimmed = value.trim();

  if (trimmed.includes(PRODUCT_DETAIL_DELIMITER)) {
    return trimmed
      .split(PRODUCT_DETAIL_DELIMITER)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const numberedItems = parseNumberedBlocks(trimmed);
  if (numberedItems.length > 0 && NUMBERED_LINE_PATTERN.test(trimmed)) {
    return numberedItems;
  }

  const blankLineBlocks = trimmed
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blankLineBlocks.length > 1) {
    return blankLineBlocks;
  }

  return parseLegacyLines(trimmed);
}

export function countProductDetailLines(value: string | null | undefined): number {
  return parseProductDetailLines(value).length;
}

export function serializeProductDetailLines(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(`\n${PRODUCT_DETAIL_DELIMITER}\n`);
}

export function formatProductDetailsForEditor(value: string | null | undefined): string {
  const lines = parseProductDetailLines(value);
  if (!lines.length) return '';

  return lines
    .map((item, index) => {
      const content = item.includes('\n')
        ? `${item.split('\n')[0]}\n${item
            .split('\n')
            .slice(1)
            .map((line) => `   ${line}`)
            .join('\n')}`
        : item;
      return `${index + 1}. ${content}`;
    })
    .join('\n\n');
}

export function joinProductDetailLines(lines: string[]): string {
  return lines.join('\n');
}

export function formatDeliveredProductDetails(lines: string[]): string {
  return lines.join('\n\n');
}
