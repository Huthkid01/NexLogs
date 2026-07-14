import { cn } from '@/lib/utils';

interface LoggsplugDescriptionViewProps {
  text: string;
  className?: string;
  /** Match LOGGSPLUG: emphasize body text under Description. */
  emphasize?: boolean;
}

type Block =
  | { type: 'heading'; text: string }
  | { type: 'body'; text: string }
  | { type: 'link'; label: string; href: string };

function isUrlLine(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function isSectionHeading(value: string): boolean {
  // Parent UI already labels the panel "Description" — keep in-content headings like LOG FORMAT.
  return /^(log format|how to use|usage|instructions)$/i.test(value.trim());
}

function parseBlocks(text: string): Block[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const blocks: Block[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (isSectionHeading(line)) {
      blocks.push({ type: 'heading', text: line.toUpperCase() });
      continue;
    }

    if (isUrlLine(line)) {
      blocks.push({ type: 'link', label: line, href: line });
      continue;
    }

    const next = lines[index + 1];
    if (next && isUrlLine(next)) {
      blocks.push({ type: 'link', label: line, href: next });
      index += 1;
      continue;
    }

    blocks.push({ type: 'body', text: line });
  }

  return blocks;
}

export function LoggsplugDescriptionView({
  text,
  className,
  emphasize = false,
}: LoggsplugDescriptionViewProps) {
  const blocks = parseBlocks(text);

  if (!blocks.length) {
    return <p className={cn('text-sm text-gray-500', className)}>No description available.</p>;
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <p
              key={`h-${index}`}
              className="pt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              {block.text}
            </p>
          );
        }

        if (block.type === 'link') {
          return (
            <a
              key={`l-${index}`}
              href={block.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-medium text-[#2563eb] underline underline-offset-2 hover:opacity-80 break-words"
            >
              {block.label}
            </a>
          );
        }

        return (
          <p
            key={`b-${index}`}
            className={cn(
              'text-sm leading-relaxed break-words whitespace-pre-wrap text-gray-900 dark:text-gray-100',
              emphasize && 'font-bold',
            )}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
