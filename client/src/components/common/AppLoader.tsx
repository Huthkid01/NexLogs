import { cn } from '@/lib/utils';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';

interface AppLoaderProps {
  fullScreen?: boolean;
  className?: string;
  iconClassName?: string;
}

export function AppLoader({ fullScreen = false, className, iconClassName }: AppLoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'flex items-center justify-center py-16',
        fullScreen && 'min-h-screen',
        className
      )}
    >
      <NexLogsLogo
        variant="icon"
        className={cn('h-12 animate-pulse', iconClassName)}
      />
    </div>
  );
}
