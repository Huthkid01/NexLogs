import { cn } from '@/lib/utils';

export const NEXLOGS_LOGO_SRC = '/images/nexlogs-logo.svg';
export const NEXLOGS_ICON_SRC = '/images/nexlogs-icon.svg';

interface NexLogsLogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  alt?: string;
}

export function NexLogsLogo({
  variant = 'full',
  className,
  alt = 'NexLogs',
}: NexLogsLogoProps) {
  return (
    <img
      src={variant === 'icon' ? NEXLOGS_ICON_SRC : NEXLOGS_LOGO_SRC}
      alt={alt}
      className={cn('w-auto shrink-0', className)}
      decoding="async"
    />
  );
}
