import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, LifeBuoy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supportTicketService } from '@/services';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const statusOptions = ['open', 'in_progress', 'resolved'] as const;

export default function AdminTicketsPage() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: supportTicketService.getAllAdmin,
  });

  const updateTicket = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'in_progress' | 'resolved' }) =>
      supportTicketService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Ticket updated');
    },
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }

  const openCount = tickets?.filter((ticket) => ticket.status !== 'resolved').length ?? 0;

  return (
    <div className={cn('space-y-6', isDark ? 'text-slate-100' : 'text-slate-900')}>
      <div className="space-y-2">
        <h1 className="admin-heading text-3xl font-semibold sm:text-4xl">Support tickets</h1>
        <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
          User-reported website errors and issue reports appear here for admin follow-up.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628] text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Open Tickets</p>
              <p className="text-2xl font-semibold">{openCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628] text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <div>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Total Tickets</p>
              <p className="text-2xl font-semibold">{tickets?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {tickets?.map((ticket) => (
          <Card key={ticket.id} className={cn(isDark ? 'border-[#18263b] bg-[#0a1527] text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{ticket.subject}</p>
                    <Badge variant="outline" className="capitalize">
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {ticket.source.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    {ticket.name || ticket.email} • {new Date(ticket.created_at).toLocaleString()}
                  </p>
                  <p className={cn('text-sm leading-6', isDark ? 'text-slate-300' : 'text-slate-700')}>
                    {ticket.description}
                  </p>
                  {ticket.error_message && (
                    <p className={cn('rounded-xl border px-3 py-2 text-xs', isDark ? 'border-[#22324a] bg-[#081624] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                      Error: {ticket.error_message}
                    </p>
                  )}
                  {ticket.page_url && (
                    <p className={cn('text-xs break-all', isDark ? 'text-slate-500' : 'text-slate-500')}>
                      Page: {ticket.page_url}
                    </p>
                  )}
                </div>

                <div className="min-w-[180px]">
                  <label className={cn('mb-2 block text-xs uppercase tracking-[0.14em]', isDark ? 'text-slate-500' : 'text-slate-500')}>
                    Ticket Status
                  </label>
                  <select
                    value={ticket.status}
                    onChange={(event) => updateTicket.mutate({ id: ticket.id, status: event.target.value as typeof statusOptions[number] })}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-sm',
                      isDark ? 'border-[#22324a] bg-[#081624] text-slate-100' : 'border-slate-200 bg-white text-slate-900'
                    )}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!tickets?.length && (
          <Card className={cn(isDark ? 'border-[#18263b] bg-[#0a1527] text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
            <CardContent className="py-12 text-center">
              <LifeBuoy className={cn('mx-auto h-10 w-10', isDark ? 'text-slate-600' : 'text-slate-400')} />
              <p className="mt-4 text-lg font-medium">No tickets yet</p>
              <p className={cn('mt-2 text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                User error reports will show here automatically.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
