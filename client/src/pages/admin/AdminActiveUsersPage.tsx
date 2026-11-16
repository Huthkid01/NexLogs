import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CalendarRange, Eye, MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { useAdminListPagination } from '@/hooks/useAdminListPagination';
import { useTheme } from '@/hooks/useTheme';
import {
  adminMainCardClass,
  adminMutedTextClass,
  adminPageClass,
  adminStatCardClass,
  adminStrongTextClass,
  adminSubtleTextClass,
} from '@/lib/admin-theme';
import { formatVisitorLocation } from '@/lib/visitor-location';
import { cn } from '@/lib/utils';
import { siteVisitService } from '@/services';

type ActivePeriod = 'weekly' | 'monthly';

function formatRelativeTime(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleString();
}

export default function AdminActiveUsersPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState<ActivePeriod>('weekly');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-active-period-stats'],
    queryFn: () => siteVisitService.getActivePeriodStats(),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-active-registered-users', period],
    queryFn: () => siteVisitService.getActiveRegisteredUsers(period),
  });

  const paging = useAdminListPagination(users, { resetKey: period });

  const cards = useMemo(
    () => [
      {
        label: 'Weekly active users',
        value: stats?.weeklyRegistered ?? 0,
        hint: 'Registered users active in the last 7 days',
        icon: CalendarRange,
        iconClass: 'bg-emerald-500/15 text-emerald-300',
      },
      {
        label: 'Monthly active users',
        value: stats?.monthlyRegistered ?? 0,
        hint: 'Registered users active in the last 30 days',
        icon: CalendarDays,
        iconClass: 'bg-blue-500/15 text-blue-300',
      },
      {
        label: 'Weekly guest sessions',
        value: stats?.weeklyGuests ?? 0,
        hint: 'Unique guest browsers in the last 7 days',
        icon: Eye,
        iconClass: 'bg-orange-500/15 text-orange-300',
      },
      {
        label: 'Monthly guest sessions',
        value: stats?.monthlyGuests ?? 0,
        hint: 'Unique guest browsers in the last 30 days',
        icon: Users,
        iconClass: 'bg-amber-500/15 text-amber-200',
      },
    ],
    [stats],
  );

  return (
    <div className={cn('space-y-5', adminPageClass(isDark))}>
      <div>
        <h1 className={cn('text-2xl font-bold', adminStrongTextClass(isDark))}>Active Users</h1>
        <p className={cn('mt-1 text-sm', adminSubtleTextClass(isDark))}>
          Weekly and monthly activity from marketplace visits (admins excluded).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={adminStatCardClass(isDark)}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn('rounded-xl p-2', card.iconClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-xs', adminMutedTextClass(isDark))}>{card.label}</p>
                  {statsLoading ? (
                    <Skeleton className="mt-2 h-7 w-16" />
                  ) : (
                    <p className={cn('mt-1 text-2xl font-bold', adminStrongTextClass(isDark))}>
                      {card.value}
                    </p>
                  )}
                  <p className={cn('mt-1 text-[11px] leading-snug', adminSubtleTextClass(isDark))}>
                    {card.hint}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className={adminMainCardClass(isDark)}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={cn('text-[15px] font-bold', adminStrongTextClass(isDark))}>
                Registered active users
              </h2>
              <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>
                {period === 'weekly' ? 'Last 7 days' : 'Last 30 days'} · {users.length} user
                {users.length === 1 ? '' : 's'}
                {stats
                  ? ` · ${period === 'weekly' ? stats.weeklyVisits : stats.monthlyVisits} page visits`
                  : ''}
              </p>
            </div>
            <div className="inline-flex rounded-xl border p-1 dark:border-[#22324a]">
              {([
                ['weekly', 'Weekly'],
                ['monthly', 'Monthly'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    period === value
                      ? isDark
                        ? 'bg-[#2d1a0f] text-orange-100'
                        : 'bg-[#fff3eb] text-[#f26522]'
                      : isDark
                        ? 'text-slate-400 hover:text-orange-100'
                        : 'text-slate-600 hover:text-[#f26522]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {usersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div
              className={cn(
                'rounded-xl border border-dashed px-4 py-10 text-center text-sm',
                isDark ? 'border-[#22324a] text-slate-400' : 'border-slate-200 text-slate-500',
              )}
            >
              No registered users were active in this period.
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {paging.paginatedItems.map((user) => (
                  <li
                    key={user.user_id}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between',
                      isDark ? 'border-[#22324a] bg-[#081321]' : 'border-slate-200 bg-white',
                    )}
                  >
                    <div className="min-w-0">
                      <p className={cn('truncate text-sm font-semibold', adminStrongTextClass(isDark))}>
                        {user.full_name}
                      </p>
                      <p className={cn('truncate text-xs', adminMutedTextClass(isDark))}>
                        {user.email || 'No email'} · Last path {user.last_path || '/'}
                      </p>
                      <p className={cn('mt-1 flex items-center gap-1 text-xs', adminSubtleTextClass(isDark))}>
                        <MapPin className="h-3 w-3 shrink-0" />
                        {formatVisitorLocation(user)}
                      </p>
                    </div>
                    <div className={cn('shrink-0 text-left text-xs sm:text-right', adminMutedTextClass(isDark))}>
                      <p>{user.page_views} page view{user.page_views === 1 ? '' : 's'}</p>
                      <p>Last seen {formatRelativeTime(user.last_seen_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <AdminListPagination
                page={paging.page}
                totalPages={paging.totalPages}
                totalItems={paging.totalItems}
                pageStart={paging.pageStart}
                pageEnd={paging.pageEnd}
                onPageChange={paging.setPage}
                isDark={isDark}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
