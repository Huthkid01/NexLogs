import { TELEGRAM_ICON_PATH } from '@/lib/platform-icons';
import { cn } from '@/lib/utils';

interface TelegramIconProps {
  className?: string;
  alt?: string;
}

export function TelegramIcon({ className, alt = 'Telegram' }: TelegramIconProps) {
  return (
    <img
      src={TELEGRAM_ICON_PATH}
      alt={alt}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
