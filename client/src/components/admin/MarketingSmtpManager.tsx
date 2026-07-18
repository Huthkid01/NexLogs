import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, Server, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_MARKETING_SMTP_ID,
  marketingSmtpService,
  type MarketingSmtpAccount,
  type MarketingSmtpInput,
} from '@/services/marketing-smtp.service';
import { useTheme } from '@/hooks/useTheme';
import { adminMutedTextClass, adminOutlineButtonClass } from '@/lib/admin-theme';
import { cn } from '@/lib/utils';

const emptyForm: MarketingSmtpInput = {
  label: '',
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  username: '',
  password: '',
  from_name: 'Nexlogs',
  from_address: '',
  is_active: true,
};

interface MarketingSmtpManagerProps {
  selectedSmtpAccountId: string;
  onSelectedSmtpAccountIdChange: (id: string) => void;
}

export function MarketingSmtpManager({
  selectedSmtpAccountId,
  onSelectedSmtpAccountIdChange,
}: MarketingSmtpManagerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MarketingSmtpInput>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['marketing-smtp-accounts'],
    queryFn: marketingSmtpService.list,
  });

  const accounts = useMemo(() => {
    const custom = (data?.accounts ?? []).filter((account) => account.is_active !== false);
    return data?.defaultAccount ? [data.defaultAccount, ...custom] : custom;
  }, [data]);

  useEffect(() => {
    if (!accounts.length) return;
    const exists = accounts.some((account) => account.id === selectedSmtpAccountId);
    if (!exists) {
      onSelectedSmtpAccountIdChange(DEFAULT_MARKETING_SMTP_ID);
    }
  }, [accounts, onSelectedSmtpAccountIdChange, selectedSmtpAccountId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return marketingSmtpService.update(editingId, form);
      }
      return marketingSmtpService.create(form);
    },
    onSuccess: (account) => {
      void queryClient.invalidateQueries({ queryKey: ['marketing-smtp-accounts'] });
      onSelectedSmtpAccountIdChange(account.id);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(editingId ? 'SMTP account updated' : 'SMTP account added');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not save SMTP account');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => marketingSmtpService.remove(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['marketing-smtp-accounts'] });
      if (selectedSmtpAccountId === id) {
        onSelectedSmtpAccountIdChange(DEFAULT_MARKETING_SMTP_ID);
      }
      toast.success('SMTP account removed');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not delete SMTP account');
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (showForm) {
        return marketingSmtpService.test(form);
      }
      return marketingSmtpService.test({ id: selectedSmtpAccountId });
    },
    onSuccess: (message) => toast.success(message),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'SMTP test failed');
    },
  });

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (account: MarketingSmtpAccount) => {
    if (account.is_default || account.id === DEFAULT_MARKETING_SMTP_ID) return;
    setEditingId(account.id);
    setForm({
      label: account.label,
      host: account.host,
      port: account.port,
      secure: account.secure,
      username: account.username,
      password: '',
      from_name: account.from_name,
      from_address: account.from_address,
      is_active: account.is_active,
    });
    setShowForm(true);
  };

  const selected = accounts.find((account) => account.id === selectedSmtpAccountId) ?? accounts[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-4 w-4 text-[#f26522]" />
          Marketing SMTP
        </CardTitle>
        <CardDescription>
          Keep the default Hostinger SMTP for normal sends, or add another SMTP and switch to it for marketing campaigns.
          Activation and password-reset emails are not affected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className={cn('text-sm', adminMutedTextClass(isDark))}>Loading SMTP accounts…</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => {
              const active = account.id === selectedSmtpAccountId;
              return (
                <div
                  key={account.id}
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
                    active
                      ? 'border-[#f26522]/50 bg-orange-50/70 dark:border-[#f26522]/40 dark:bg-[#1a1208]'
                      : isDark
                        ? 'border-[#22324a] bg-[#0b1628]'
                        : 'border-slate-200 bg-slate-50',
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectedSmtpAccountIdChange(account.id)}
                  >
                    <p className="truncate text-sm font-semibold">
                      {account.label}
                      {account.is_default || account.id === DEFAULT_MARKETING_SMTP_ID ? ' · Default' : ''}
                    </p>
                    <p className={cn('mt-0.5 truncate text-xs', adminMutedTextClass(isDark))}>
                      {account.from_name} &lt;{account.from_address}&gt; · {account.host}:{account.port}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Check className="h-3.5 w-3.5" />
                        Selected for sending
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={adminOutlineButtonClass(isDark)}
                        onClick={() => onSelectedSmtpAccountIdChange(account.id)}
                      >
                        Use this
                      </Button>
                    )}
                    {!(account.is_default || account.id === DEFAULT_MARKETING_SMTP_ID) && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={adminOutlineButtonClass(isDark)}
                          onClick={() => startEdit(account)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn(adminOutlineButtonClass(isDark), 'text-red-600 dark:text-red-300')}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Remove SMTP account "${account.label}"?`)) {
                              deleteMutation.mutate(account.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" className="bg-[#f26522] text-white hover:bg-[#d94e0f]" onClick={startCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add SMTP account
          </Button>
          <Button
            type="button"
            variant="outline"
            className={adminOutlineButtonClass(isDark)}
            disabled={testMutation.isPending || (!showForm && !selected)}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Test selected / form SMTP
          </Button>
        </div>

        {selected && !showForm && (
          <p className={cn('text-xs leading-5', adminMutedTextClass(isDark))}>
            Marketing emails will send from <strong>{selected.from_address}</strong> using{' '}
            <strong>{selected.label}</strong>. Prefer inbox-friendly Account templates for Primary placement.
          </p>
        )}

        {showForm && (
          <div className={cn('space-y-3 rounded-xl border p-4', isDark ? 'border-[#22324a] bg-[#081324]' : 'border-slate-200 bg-white')}>
            <p className="text-sm font-semibold">{editingId ? 'Edit SMTP account' : 'New SMTP account'}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="smtp-label">Label</Label>
                <Input
                  id="smtp-label"
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Hostinger marketing / Gmail SMTP"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-host">Host</Label>
                <Input
                  id="smtp-host"
                  value={form.host}
                  onChange={(event) => setForm((current) => ({ ...current, host: event.target.value }))}
                  placeholder="smtp.hostinger.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={form.port}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, port: Number(event.target.value) || 465 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-username">Username</Label>
                <Input
                  id="smtp-username"
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="support@yourdomain.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-password">Password {editingId ? '(leave blank to keep)' : ''}</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={form.password || ''}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="SMTP password / app password"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-from-name">From name</Label>
                <Input
                  id="smtp-from-name"
                  value={form.from_name}
                  onChange={(event) => setForm((current) => ({ ...current, from_name: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-from-address">From email</Label>
                <Input
                  id="smtp-from-address"
                  value={form.from_address}
                  onChange={(event) => setForm((current) => ({ ...current, from_address: event.target.value }))}
                  placeholder="support@yourdomain.com"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.secure !== false}
                onChange={(event) => setForm((current) => ({ ...current, secure: event.target.checked }))}
              />
              Use secure connection (SSL/TLS)
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-[#f26522] text-white hover:bg-[#d94e0f]"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                {editingId ? 'Save changes' : 'Save SMTP account'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={adminOutlineButtonClass(isDark)}
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
