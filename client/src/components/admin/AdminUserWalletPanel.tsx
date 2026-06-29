import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { adminService } from '@/services';
import { formatPrice } from '@/lib/utils';

interface AdminUserWalletPanelProps {
  userId: string;
  userEmail: string;
  userName: string;
  walletBalance: number;
}

export function AdminUserWalletPanel({
  userId,
  userEmail,
  userName,
  walletBalance,
}: AdminUserWalletPanelProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creditNgn, setCreditNgn] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditRef, setCreditRef] = useState('');

  const creditWallet = useMutation({
    mutationFn: () =>
      adminService.creditUserWallet({
        userId,
        amountUsd: Number(creditNgn),
        reason: creditReason.trim(),
        externalRef: creditRef.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(`Added ${formatPrice(Number(creditNgn))} to ${userName || userEmail}'s wallet`);
      setCreditNgn('');
      setCreditReason('');
      setCreditRef('');
      void queryClient.invalidateQueries({ queryKey: ['admin-users-wallets'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-wallet-transactions'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to add funds';
      toast.error(message);
    },
  });

  const handleCredit = () => {
    const amount = Number(creditNgn);
    if (!creditNgn.trim() || Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid NGN amount');
      return;
    }
    if (!creditReason.trim()) {
      toast.error('Enter a short reason');
      return;
    }
    if (
      !window.confirm(
        `Add ${formatPrice(amount)} to ${userEmail}'s wallet?`,
      )
    ) {
      return;
    }
    creditWallet.mutate();
  };

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Wallet className="h-4 w-4 text-[#f26522]" />
          Wallet: {formatPrice(walletBalance)}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2 rounded-md border border-dashed border-[#f26522]/40 bg-[#fffaf7] p-3 dark:bg-[#f26522]/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#c44d10]">
            Add funds to wallet
          </p>
          <p className="text-xs text-muted-foreground">
            Use when a user paid via Kora but the balance did not update. Confirm the payment in
            Kora first, then add the correct NGN amount here. View full history under Wallet
            Transactions.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Amount in NGN"
              value={creditNgn}
              onChange={(event) => setCreditNgn(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              type="text"
              placeholder="Kora reference (optional)"
              value={creditRef}
              onChange={(event) => setCreditRef(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <input
            type="text"
            placeholder="Reason (e.g. Kora payment verified manually)"
            value={creditReason}
            onChange={(event) => setCreditReason(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="bg-[#f26522] hover:bg-[#d94e0f]"
            disabled={creditWallet.isPending}
            onClick={handleCredit}
          >
            {creditWallet.isPending ? 'Adding…' : 'Add to wallet'}
          </Button>
        </div>
      )}
    </div>
  );
}
