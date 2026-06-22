import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { activityLogService } from '@/services';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

function formatAction(action: string) {
  return action.replaceAll('_', ' ');
}

function isViolationLog(action: string) {
  return action === 'terms_violation_flagged';
}

export default function AdminActivityLogsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-activity-logs'],
    queryFn: activityLogService.getAllAdmin,
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  }

  return (
    <div className={cn('space-y-6', isDark ? 'text-slate-100' : 'text-slate-900')}>
      <div className="space-y-2">
        <h1 className="admin-heading text-3xl font-semibold sm:text-4xl">Activity logs</h1>
        <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Actions from registered users only. Admin activity is not shown here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628] text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Recent Logs</p>
              <p className="text-2xl font-semibold">{logs?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {logs?.map((log) => (
          <Card key={log.id} className={cn(isDark ? 'border-[#18263b] bg-[#0a1527] text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
            <CardContent className="space-y-3 p-5">
              {isViolationLog(log.action) && (
                <div className={cn(
                  'rounded-xl border px-4 py-3 text-sm font-semibold',
                  isDark ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'
                )}>
                  Terms violation flagged for this user.
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold capitalize">{formatAction(log.action)}</p>
                    {log.entity && (
                      <Badge variant="outline" className="capitalize">
                        {log.entity}
                      </Badge>
                    )}
                    {isViolationLog(log.action) && (
                      <Badge className="bg-red-600 text-white hover:bg-red-600">
                        Violated
                      </Badge>
                    )}
                  </div>
                  <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    {log.profile?.full_name || log.profile?.email || 'Unknown user'} • {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                {log.entity_id && (
                  <p className={cn('text-xs break-all', isDark ? 'text-slate-500' : 'text-slate-500')}>
                    ID: {log.entity_id}
                  </p>
                )}
              </div>

              {log.metadata && (
                <div className={cn('rounded-xl border px-3 py-2 text-xs', isDark ? 'border-[#22324a] bg-[#081624] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                  {JSON.stringify(log.metadata)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {!logs?.length && (
          <Card className={cn(isDark ? 'border-[#18263b] bg-[#0a1527] text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
            <CardContent className="py-12 text-center">
              <Activity className={cn('mx-auto h-10 w-10', isDark ? 'text-slate-600' : 'text-slate-400')} />
              <p className="mt-4 text-lg font-medium">No activity yet</p>
              <p className={cn('mt-2 text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                Actions from registered users will appear here. Admin activity is hidden.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
