import { Toaster } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme}
      position="top-right"
      closeButton
      expand={false}
      visibleToasts={2}
      gap={12}
      offset={{ top: 20, right: 20, left: 20 }}
      duration={2000}
      toastOptions={{
        classNames: {
          toast: cn(
            'nexlogs-toast group pointer-events-auto w-full max-w-[380px] rounded-xl border px-4 py-3.5 pr-10 shadow-lg backdrop-blur-sm',
            'bg-white/95 text-slate-900 border-slate-200/90',
            'dark:bg-[#151c28]/95 dark:text-slate-100 dark:border-[#243044]',
          ),
          title: 'text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50',
          description: 'text-sm leading-relaxed text-slate-600 dark:text-slate-400',
          content: 'flex flex-col gap-0.5',
          icon: 'shrink-0',
          closeButton: cn(
            'nexlogs-toast-close !left-auto !right-2 !top-2 !transform-none',
            '!h-7 !w-7 !rounded-lg !border !border-slate-200 !bg-white !text-slate-500',
            'hover:!bg-slate-50 hover:!text-slate-900',
            'dark:!border-[#243044] dark:!bg-[#0f1419] dark:!text-slate-400',
            'dark:hover:!bg-[#1a2332] dark:hover:!text-slate-100',
          ),
          success: 'nexlogs-toast-success !border-l-4 !border-l-emerald-500',
          error: 'nexlogs-toast-error !border-l-4 !border-l-red-500',
          warning: 'nexlogs-toast-warning !border-l-4 !border-l-amber-500',
          info: 'nexlogs-toast-info !border-l-4 !border-l-[#f26522]',
          loading: 'nexlogs-toast-loading !border-l-4 !border-l-[#f26522]',
          default: 'nexlogs-toast-default !border-l-4 !border-l-[#f26522]',
        },
      }}
    />
  );
}
