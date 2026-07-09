import type { ElementType } from 'react';
import { linkifyText } from '@/lib/linkify-text';
import { cn } from '@/lib/utils';

interface LinkifiedTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
  as?: ElementType;
}

const DEFAULT_LINK_CLASS = 'text-[#f26522] underline break-all hover:opacity-80';

export function LinkifiedText({
  text,
  className,
  linkClassName,
  as: Tag = 'span',
}: LinkifiedTextProps) {
  const parts = linkifyText(text);

  return (
    <Tag className={className}>
      {parts.map((part, index) =>
        part.type === 'link' ? (
          <a
            key={`link-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(DEFAULT_LINK_CLASS, linkClassName)}
          >
            {part.label}
          </a>
        ) : (
          <span key={`text-${index}`}>{part.value}</span>
        ),
      )}
    </Tag>
  );
}
