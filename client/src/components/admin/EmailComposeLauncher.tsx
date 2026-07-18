import type { LucideIcon } from 'lucide-react';
import { Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailComposeLauncherProps {
  title: string;
  description: string;
  meta?: string;
  icon: LucideIcon;
  isDark: boolean;
  active?: boolean;
  accent?: 'orange' | 'sky';
  onClick: () => void;
}

export function EmailComposeLauncher({
  title,
  description,
  meta,
  icon: Icon,
  isDark,
  active = false,
  accent = 'orange',
  onClick,
}: EmailComposeLauncherProps) {
  const accentStyles =
    accent === 'sky'
      ? {
          iconWrap: isDark ? 'bg-sky-950/50 text-sky-300' : 'bg-sky-50 text-sky-600',
          ring: 'ring-sky-400/40',
          hover: isDark ? 'hover:border-sky-500/40' : 'hover:border-sky-300',
        }
      : {
          iconWrap: isDark ? 'bg-[#1a1208] text-[#f26522]' : 'bg-orange-50 text-[#f26522]',
          ring: 'ring-[#f26522]/35',
          hover: isDark ? 'hover:border-[#f26522]/40' : 'hover:border-orange-300',
        };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-4 rounded-2xl border px-5 py-5 text-left transition duration-200',
        isDark
          ? 'border-[#1f2e46] bg-[#0b1628] shadow-none'
          : 'border-slate-200 bg-white shadow-sm',
        accentStyles.hover,
        active && cn('ring-2', accentStyles.ring),
        !isDark && 'hover:shadow-md',
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-[1.03]',
          accentStyles.iconWrap,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold tracking-tight">{title}</p>
            <p
              className={cn(
                'mt-1 text-sm leading-relaxed',
                isDark ? 'text-slate-400' : 'text-slate-500',
              )}
            >
              {description}
            </p>
          </div>
          <Maximize2
            className={cn(
              'mt-1 h-4 w-4 shrink-0 opacity-50 transition group-hover:opacity-100',
              isDark ? 'text-slate-400' : 'text-slate-400',
            )}
          />
        </div>
        {meta && (
          <p
            className={cn(
              'mt-3 truncate text-xs font-medium',
              isDark ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            {meta}
          </p>
        )}
      </div>
    </button>
  );
}
