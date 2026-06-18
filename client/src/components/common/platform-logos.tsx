import type { PlatformType } from '@/types';
import { cn } from '@/lib/utils';
import { PLATFORM_ICON_PATHS } from '@/lib/platform-icons';

const PLATFORM_LABELS: Record<PlatformType, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X',
  youtube: 'YouTube',
  snapchat: 'Snapchat',
};

export function PlatformLogo({
  platform,
  size = 'md',
  className,
}: {
  platform: PlatformType;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const dimension = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const imageSrc = PLATFORM_ICON_PATHS[platform];

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={`${PLATFORM_LABELS[platform]} logo`}
        className={cn('shrink-0 object-contain rounded-md', dimension, className)}
      />
    );
  }

  return null;
}
