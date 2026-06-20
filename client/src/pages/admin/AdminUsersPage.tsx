import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { activityLogService, adminService } from '@/services';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      adminService.updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
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

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage registered users, roles, and account status.</p>
      </div>
      <div className="space-y-3">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant={user.role === 'admin' ? 'accent' : 'secondary'}>{user.role}</Badge>
                  {user.is_suspended && <Badge variant="destructive">Suspended</Badge>}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={currentUser?.id === user.id && user.role === 'admin'}
                  onClick={() =>
                    updateUser.mutate({
                      id: user.id,
                      updates: { role: user.role === 'admin' ? 'user' : 'admin' },
                    })
                  }
                >
                  {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                </Button>
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
    </div>
  );
}
