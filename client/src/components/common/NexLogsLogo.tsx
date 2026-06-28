import { cn } from '@/lib/utils';
import { EMAIL_ICON_PATH, EMAIL_LOGO_PATH } from '@/lib/email-branding';

export const NEXLOGS_LOGO_SRC = EMAIL_LOGO_PATH;
export const NEXLOGS_ICON_SRC = EMAIL_ICON_PATH;

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
