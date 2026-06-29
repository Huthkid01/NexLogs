import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/useTheme';
import { adminService, isRecoveredKoraDeposit } from '@/services/misc.service';
import { cn, formatPrice } from '@/lib/utils';
import type { AdminWalletDepositRecord } from '@/types';

function formatPaidAmount(tx: AdminWalletDepositRecord) {
  const meta = tx.metadata ?? {};
  const originalAmount = meta.original_amount;
  const originalCurrency = meta.original_currency;
  if (originalAmount != null && originalCurrency) {
    return `${originalAmount} ${originalCurrency}`;
  }
  const charged = meta.charged_amount;
  const chargedCurrency = meta.charged_currency;
  if (charged != null && chargedCurrency) {
    return `${charged} ${chargedCurrency}`;
  }
  return null;
}

function getPaymentRef(tx: AdminWalletDepositRecord) {
  const meta = tx.metadata ?? {};
  if (meta.tx_ref) return String(meta.tx_ref);
  if (meta.kora_reference) return String(meta.kora_reference);
  return null;
}

function getTransactionLabel(tx: AdminWalletDepositRecord) {
  return isRecoveredKoraDeposit(tx) ? 'Recovered Kora payment' : 'Kora payment';
}

function statusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed') return 'destructive';
  return 'secondary';
}

export default function AdminTransactionsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');

  const { data: transactions, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-wallet-transactions'],
    queryFn: () => adminService.getWalletFundTransactions(250),
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions ?? [];

    return (transactions ?? []).filter((tx) => {
      const paymentRef = getPaymentRef(tx)?.toLowerCase() ?? '';
      const paid = formatPaidAmount(tx)?.toLowerCase() ?? '';

      return (
        tx.user_email.toLowerCase().includes(query) ||
        tx.user_name.toLowerCase().includes(query) ||
        tx.ref.toLowerCase().includes(query) ||
        paymentRef.includes(query) ||
        paid.includes(query)
      );
    });
  }, [transactions, search]);

  const stats = useMemo(() => {
    const completed = filtered.filter((tx) => tx.status === 'completed');
    const totalUsd = completed.reduce((sum, tx) => sum + tx.amount, 0);
    const recoveredCount = filtered.filter(isRecoveredKoraDeposit).length;
    return {
      count: filtered.length,
      totalUsd,
      completedCount: completed.length,
      recoveredCount,
    };
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', isDark ? 'text-slate-100' : 'text-slate-900')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="admin-heading text-3xl font-semibold sm:text-4xl">Wallet transactions</h1>
          <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Kora add-funds payments and recovered Kora deposits when a user paid but the balance did
            not update. Flutterwave and unrelated manual credits are hidden.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => void refetch()}
          className={isDark ? 'border-[#22324a] bg-[#0a1628]' : undefined}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628]' : 'border-slate-200 bg-white')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f26522]/15 text-[#f26522]">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Transactions</p>
              <p className="text-2xl font-semibold">{stats.count}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628]' : 'border-slate-200 bg-white')}>
          <CardContent className="p-5">
            <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Completed</p>
            <p className="text-2xl font-semibold">{stats.completedCount}</p>
          </CardContent>
        </Card>
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628]' : 'border-slate-200 bg-white')}>
          <CardContent className="p-5">
            <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Recovered payments</p>
            <p className="text-2xl font-semibold">{stats.recoveredCount}</p>
          </CardContent>
        </Card>
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628]' : 'border-slate-200 bg-white')}>
          <CardContent className="p-5">
            <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Total credited (USD)</p>
            <p className="text-2xl font-semibold">{formatPrice(stats.totalUsd)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search email, name, NEX- reference, amount…"
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
        />
      </div>

      {!filtered.length ? (
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628]' : 'border-slate-200 bg-white')}>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No wallet transactions match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((tx) => {
            const paid = formatPaidAmount(tx);
            const paymentRef = getPaymentRef(tx);
            const recovered = isRecoveredKoraDeposit(tx);

            return (
              <Card key={tx.id} className={cn(isDark ? 'border-[#18263b] bg-[#0b1628]' : 'border-slate-200 bg-white')}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{tx.user_name || tx.user_email}</p>
                        <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge>
                        <Badge variant="outline">{getTransactionLabel(tx)}</Badge>
                        {recovered && <Badge variant="secondary">Balance recovered</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{tx.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()} · Ref {tx.ref}
                      </p>
                      {paid && (
                        <p className="text-sm">
                          Paid: <span className="font-medium">{paid}</span>
                        </p>
                      )}
                      {paymentRef && (
                        <p className="text-xs text-muted-foreground break-all">
                          Kora ref: {paymentRef}
                        </p>
                      )}
                      {tx.metadata?.reason != null && (
                        <p className="text-xs text-muted-foreground">{String(tx.metadata.reason)}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                      <p className="text-2xl font-semibold text-[#f26522]">{formatPrice(tx.amount)}</p>
                      <p className="text-xs text-muted-foreground">Wallet credit (USD)</p>
                      <Link
                        to="/admin/users"
                        className="text-xs font-medium text-[#f26522] hover:underline"
                      >
                        View user in Users
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
