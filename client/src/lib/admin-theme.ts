import { cn } from '@/lib/utils';

export function adminPageClass(isDark: boolean) {
  return cn(isDark ? 'text-slate-100' : 'text-slate-900');
}

export function adminStatCardClass(isDark: boolean) {
  return cn(
    'admin-panel rounded-2xl',
    isDark ? 'border-[#18263b] bg-[#0b1628] text-slate-100' : 'border-slate-200 bg-white text-slate-900 shadow-sm',
  );
}

export function adminMainCardClass(isDark: boolean) {
  return cn(
    'admin-panel min-w-0 overflow-hidden rounded-2xl',
    isDark ? 'border-[#18263b] bg-[#091427] text-slate-100' : 'border-slate-200 bg-white text-slate-900 shadow-sm',
  );
}

export function adminMutedTextClass(isDark: boolean) {
  return cn(isDark ? 'text-slate-400' : 'text-slate-600');
}

export function adminSubtleTextClass(isDark: boolean) {
  return cn(isDark ? 'text-slate-500' : 'text-slate-500');
}

export function adminStrongTextClass(isDark: boolean) {
  return cn(isDark ? 'text-slate-50' : 'text-slate-900');
}

export function adminInputClass(isDark: boolean) {
  return cn(
    'admin-input',
    isDark
      ? 'border-[#22324a] bg-[#06101d] text-slate-100 placeholder:text-slate-500'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400',
  );
}

export function adminModalOverlayClass(isDark: boolean, zIndexClass = 'z-[70]') {
  return cn(
    'fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm',
    zIndexClass,
    isDark ? 'bg-[#020817]/70' : 'bg-black/40',
  );
}

export function adminModalClass(isDark: boolean) {
  return cn(
    'admin-panel w-full min-w-0 max-w-4xl overflow-x-hidden rounded-[1.75rem]',
    isDark ? 'border-[#1f2e46] bg-[#081324] text-slate-100' : 'border-slate-200 bg-white text-slate-900 shadow-xl',
  );
}

export function adminModalSectionClass(isDark: boolean) {
  return cn('min-w-0 rounded-2xl border p-5', isDark ? 'border-[#18263b] bg-[#06111f]' : 'border-slate-200 bg-slate-50');
}

export function adminIconButtonClass(isDark: boolean) {
  return cn(
    'inline-flex h-10 w-10 items-center justify-center rounded-full border',
    isDark
      ? 'border-[#22324a] bg-[#0a1628] text-slate-400 hover:text-slate-100'
      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900',
  );
}

export function adminActionIconButtonClass(isDark: boolean) {
  return cn(
    'h-9 w-9 rounded-xl border',
    isDark
      ? 'border-[#22324a] bg-[#0b1628] text-slate-200 hover:bg-[#10213a]'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
  );
}

export function adminTableShellClass(isDark: boolean) {
  return cn('overflow-x-auto rounded-2xl border [-webkit-overflow-scrolling:touch]', isDark ? 'border-[#18263b]' : 'border-slate-200');
}

export function adminTableHeaderClass(isDark: boolean) {
  return cn(
    'border-b px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]',
    isDark ? 'border-[#18263b] bg-[#0c1830] text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500',
  );
}

export function adminTableBodyClass(isDark: boolean) {
  return cn(isDark ? 'divide-[#18263b] bg-[#07111f]' : 'divide-slate-200 bg-white', 'divide-y');
}

export function adminTableRowHoverClass(isDark: boolean) {
  return cn(isDark ? 'hover:bg-[#0b1a30]' : 'hover:bg-slate-50');
}

export function adminPlatformIconWrapClass(isDark: boolean) {
  return cn(
    'flex shrink-0 items-center justify-center rounded-xl',
    isDark ? 'bg-[#0d1d33] text-slate-100' : 'bg-slate-100 text-slate-700',
  );
}

export function adminOutlineButtonClass(isDark: boolean) {
  return cn(
    isDark ? 'border-[#22324a] bg-[#081624] text-slate-100 hover:bg-[#10213a]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
  );
}
