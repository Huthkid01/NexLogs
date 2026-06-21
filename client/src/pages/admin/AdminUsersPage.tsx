import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Globe2, Trash2, Users, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { activityLogService, adminService, siteVisitService } from '@/services';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type UsersTab = 'registered' | 'active' | 'visits';

function formatRelativeTime(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleString();
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<UsersTab>('registered');

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  });

  const { data: visitorStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-visitor-stats'],
    queryFn: siteVisitService.getStats,
    refetchInterval: 30_000,
  });

  const { data: activeSessions, isLoading: activeLoading } = useQuery({
    queryKey: ['admin-active-sessions'],
    queryFn: siteVisitService.getActiveSessions,
    refetchInterval: 30_000,
    enabled: activeTab === 'active',
  });

  const { data: recentVisits, isLoading: visitsLoading } = useQuery({
    queryKey: ['admin-recent-visits'],
    queryFn: () => siteVisitService.getRecentPageViews(100),
    refetchInterval: 30_000,
    enabled: activeTab === 'visits',
  });

  const updateUser = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      adminService.updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
    },
  });

  const clearVisits = useMutation({
    mutationFn: siteVisitService.clearAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-visitor-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-visits'] });
      toast.success('All marketplace visits cleared');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to clear visits';
      toast.error(message);
    },
  });

  const flagViolation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await adminService.updateUser(id, { is_suspended: true });
      await activityLogService.create({
        user_id: id,
        action: 'terms_violation_flagged',
        entity: 'terms',
        entity_id: null,
        metadata: {
          reason: 'Violation of terms and conditions',
          flagged_by: currentUser?.id ?? null,
          user_name: name,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity-logs'] });
      toast.success('User flagged for terms violation');
    },
  });

  const activeRegisteredUsers = useMemo(
    () => users?.filter((user) => !user.is_suspended).length ?? 0,
    [users],
  );

  const statCards = [
    {
      label: 'Registered users',
      value: visitorStats?.registeredUsers ?? 0,
      icon: Users,
      iconClass: 'bg-blue-500/15 text-blue-300',
    },
    {
      label: 'Active accounts',
      value: activeRegisteredUsers,
      icon: UserCheck,
      iconClass: 'bg-emerald-500/15 text-emerald-300',
    },
    {
      label: 'Marketplace active (15 min)',
      value: visitorStats?.activeVisitors ?? 0,
      icon: Eye,
      iconClass: 'bg-violet-500/15 text-violet-300',
    },
    {
      label: 'Marketplace visits today',
      value: visitorStats?.visitsToday ?? 0,
      icon: Globe2,
      iconClass: 'bg-amber-500/15 text-amber-200',
    },
  ];

  const tabs: Array<{ id: UsersTab; label: string }> = [
    { id: 'registered', label: 'Registered Users' },
    { id: 'active', label: 'Active Visitors' },
    { id: 'visits', label: 'Recent Visits' },
  ];

  const isLoading = usersLoading || statsLoading;

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold">Users & Visitors</h1>
        <p className="text-sm text-muted-foreground">
          Manage registered accounts and monitor homepage/marketplace visitors only (guests and registered users).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              isDark ? 'border-[#18263b] bg-[#0b1628] text-slate-100' : 'border-slate-200 bg-white text-slate-900',
            )}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', stat.iconClass)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={activeTab === tab.id ? 'default' : 'outline'}
            className={activeTab === tab.id ? 'bg-[#f26522] hover:bg-[#d94e0f]' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'registered' && (
        <div className="space-y-3">
          {users?.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant={user.role === 'admin' ? 'accent' : 'secondary'}>{user.role}</Badge>
                    {user.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="success">Active account</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant={user.is_suspended ? 'default' : 'destructive'}
                    className="w-full sm:w-auto"
                    onClick={() => updateUser.mutate({ id: user.id, updates: { is_suspended: !user.is_suspended } })}
                  >
                    {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                  </Button>
                  <Button
                    size="sm"
                    className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
                    disabled={currentUser?.id === user.id}
                    onClick={() => flagViolation.mutate({ id: user.id, name: user.full_name })}
                  >
                    Flag Violation
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'active' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {visitorStats?.activeRegistered ?? 0} registered and {visitorStats?.activeGuests ?? 0} guest visitors on the homepage or marketplace in the last 15 minutes.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700"
              disabled={clearVisits.isPending}
              onClick={() => {
                if (window.confirm('Clear all marketplace visit history? This cannot be undone.')) {
                  clearVisits.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Clear all visits
            </Button>
          </div>
          {activeLoading ? (
            <Skeleton className="h-24" />
          ) : activeSessions?.length ? (
            activeSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={session.visitor_type === 'registered' ? 'success' : 'secondary'}>
                        {session.visitor_type === 'registered' ? 'Registered' : 'Guest'}
                      </Badge>
                      <span className="text-sm font-medium">
                        {session.profile?.full_name || session.profile?.email || 'Anonymous visitor'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Last page: {session.last_path}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.page_views} page views • Last seen {formatRelativeTime(session.last_seen_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No visitors on the homepage or marketplace in the last 15 minutes.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Homepage and marketplace page views only.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700"
              disabled={clearVisits.isPending}
              onClick={() => {
                if (window.confirm('Clear all marketplace visit history? This cannot be undone.')) {
                  clearVisits.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Clear all visits
            </Button>
          </div>
          {visitsLoading ? (
            <Skeleton className="h-24" />
          ) : recentVisits?.length ? (
            recentVisits.map((visit) => (
              <Card key={visit.id}>
                <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={visit.visitor_type === 'registered' ? 'success' : 'secondary'}>
                        {visit.visitor_type === 'registered' ? 'Registered' : 'Guest'}
                      </Badge>
                      <span className="text-sm font-medium">
                        {visit.profile?.email || 'Anonymous visitor'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{visit.path}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(visit.created_at).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No marketplace visits recorded yet.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
