import { PlatformLogo } from '@/components/common/platform-logos';
import type { PlatformType } from '@/types';

interface PlatformIconProps {
  platform: PlatformType;
  size?: 'sm' | 'md';
  className?: string;
}

export function PlatformIcon({ platform, size = 'md', className }: PlatformIconProps) {
  return <PlatformLogo platform={platform} size={size} className={className} />;
}
