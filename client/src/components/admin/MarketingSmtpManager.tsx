import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, Server, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_MARKETING_SMTP_ID,
  marketingSmtpService,
  type MarketingSmtpAccount,
  type MarketingSmtpInput,
} from '@/services/marketing-smtp.service';
import { useTheme } from '@/hooks/useTheme';
import { useModalLock } from '@/hooks/useModalLock';
import {
  adminIconButtonClass,
  adminModalClass,
  adminModalOverlayClass,
  adminMutedTextClass,
  adminOutlineButtonClass,
} from '@/lib/admin-theme';
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
  /** Optional callback so composers can show the live From address. */
  onActiveAccountChange?: (account: MarketingSmtpAccount | null) => void;
}

export function MarketingSmtpManager({
  selectedSmtpAccountId,
  onSelectedSmtpAccountIdChange,
  onActiveAccountChange,
}: MarketingSmtpManagerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const selected = accounts.find((account) => account.id === selectedSmtpAccountId) ?? accounts[0] ?? null;

  useEffect(() => {
    if (!accounts.length) return;
    const exists = accounts.some((account) => account.id === selectedSmtpAccountId);
    if (!exists) {
      onSelectedSmtpAccountIdChange(DEFAULT_MARKETING_SMTP_ID);
    }
  }, [accounts, onSelectedSmtpAccountIdChange, selectedSmtpAccountId]);

  useEffect(() => {
    onActiveAccountChange?.(selected ?? null);
  }, [onActiveAccountChange, selected]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  useModalLock(modalOpen, closeModal);

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
      closeModal();
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
      if (modalOpen) {
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
    setPickerOpen(false);
    setModalOpen(true);
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
    setPickerOpen(false);
    setModalOpen(true);
  };

  const canSave =
    Boolean(form.label.trim()) &&
    Boolean(form.host.trim()) &&
    Boolean(form.username.trim()) &&
    Boolean(form.from_address.trim()) &&
    (editingId ? true : Boolean(form.password?.trim()));

  return (
    <>
      <div
        className={cn(
          'flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5',
          isDark ? 'border-[#1f2e46] bg-[#0b1628]' : 'border-slate-200 bg-white shadow-sm',
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              isDark ? 'bg-[#132038] text-[#f26522]' : 'bg-orange-50 text-[#f26522]',
            )}
          >
            <Server className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Sending account</p>
            <p className={cn('mt-0.5 text-xs leading-5', adminMutedTextClass(isDark))}>
              Marketing mail only. Activation and password resets stay on system SMTP.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              disabled={isLoading || !selected}
              onClick={() => setPickerOpen((value) => !value)}
              className={cn(
                'inline-flex max-w-[min(100%,280px)] items-center gap-2 rounded-full border px-3 py-2 text-left text-sm transition',
                isDark
                  ? 'border-[#22324a] bg-[#06111f] hover:border-[#f26522]/40'
                  : 'border-slate-200 bg-slate-50 hover:border-[#f26522]/50',
              )}
            >
              <span className="min-w-0 truncate font-medium">
                {isLoading ? 'Loading…' : selected?.label ?? 'No SMTP'}
              </span>
              {selected && (
                <span className={cn('hidden truncate text-xs sm:inline', adminMutedTextClass(isDark))}>
                  {selected.from_address}
                </span>
              )}
            </button>

            {pickerOpen && selected && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20"
                  aria-label="Close SMTP picker"
                  onClick={() => setPickerOpen(false)}
                />
                <div
                  className={cn(
                    'absolute right-0 top-full z-30 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border shadow-xl',
                    isDark ? 'border-[#22324a] bg-[#0b1628]' : 'border-slate-200 bg-white',
                  )}
                >
                  <div className={cn('border-b px-4 py-3', isDark ? 'border-[#18263b]' : 'border-slate-100')}>
                    <p className="text-sm font-semibold">Choose SMTP</p>
                    <p className={cn('mt-0.5 text-xs', adminMutedTextClass(isDark))}>
                      Selected account is used for the next send.
                    </p>
                  </div>
                  <div className="max-h-72 space-y-1 overflow-y-auto p-2">
                    {accounts.map((account) => {
                      const active = account.id === selectedSmtpAccountId;
                      const isDefault =
                        account.is_default || account.id === DEFAULT_MARKETING_SMTP_ID;
                      return (
                        <div
                          key={account.id}
                          className={cn(
                            'flex items-start gap-2 rounded-xl px-3 py-2.5',
                            active
                              ? isDark
                                ? 'bg-[#1a1208]'
                                : 'bg-orange-50'
                              : isDark
                                ? 'hover:bg-[#06111f]'
                                : 'hover:bg-slate-50',
                          )}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              onSelectedSmtpAccountIdChange(account.id);
                              setPickerOpen(false);
                            }}
                          >
                            <p className="flex items-center gap-1.5 text-sm font-medium">
                              {account.label}
                              {isDefault && (
                                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                  Default
                                </span>
                              )}
                              {active && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                            </p>
                            <p className={cn('mt-0.5 truncate text-xs', adminMutedTextClass(isDark))}>
                              {account.from_name} &lt;{account.from_address}&gt;
                            </p>
                          </button>
                          {!isDefault && (
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                className={cn('rounded-lg px-2 py-1 text-xs', adminMutedTextClass(isDark))}
                                onClick={() => startEdit(account)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="rounded-lg px-2 py-1 text-xs text-red-600 dark:text-red-300"
                                disabled={deleteMutation.isPending}
                                onClick={() => {
                                  if (window.confirm(`Remove SMTP account "${account.label}"?`)) {
                                    deleteMutation.mutate(account.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={adminOutlineButtonClass(isDark)}
            disabled={testMutation.isPending || !selected}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Test
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-[#f26522] text-white hover:bg-[#d94e0f]"
            onClick={startCreate}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add SMTP
          </Button>
        </div>
      </div>

      {modalOpen && (
        <div className={adminModalOverlayClass(isDark, 'z-[90]')}>
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeModal}
            aria-label="Close SMTP modal"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="smtp-modal-title"
            className={cn(adminModalClass(isDark), 'relative z-10 max-w-xl')}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={cn(
                'flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6',
                isDark ? 'border-[#18263b]' : 'border-slate-200',
              )}
            >
              <div>
                <h2 id="smtp-modal-title" className="text-lg font-semibold tracking-tight">
                  {editingId ? 'Edit SMTP account' : 'Add SMTP account'}
                </h2>
                <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>
                  Hostinger, Gmail app password, or any SMTP provider. Used for marketing sends only.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={adminIconButtonClass(isDark)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[min(70vh,560px)] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="smtp-label">Label</Label>
                  <Input
                    id="smtp-label"
                    value={form.label}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, label: event.target.value }))
                    }
                    placeholder="Hostinger marketing / Gmail SMTP"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-host">Host</Label>
                  <Input
                    id="smtp-host"
                    value={form.host}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, host: event.target.value }))
                    }
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
                      setForm((current) => ({
                        ...current,
                        port: Number(event.target.value) || 465,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-username">Username</Label>
                  <Input
                    id="smtp-username"
                    value={form.username}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, username: event.target.value }))
                    }
                    placeholder="support@yourdomain.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-password">
                    Password {editingId ? '(leave blank to keep)' : ''}
                  </Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    value={form.password || ''}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="SMTP password / app password"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-from-name">From name</Label>
                  <Input
                    id="smtp-from-name"
                    value={form.from_name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, from_name: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-from-address">From email</Label>
                  <Input
                    id="smtp-from-address"
                    value={form.from_address}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, from_address: event.target.value }))
                    }
                    placeholder="support@yourdomain.com"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.secure !== false}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, secure: event.target.checked }))
                  }
                />
                Use secure connection (SSL/TLS)
              </label>
            </div>

            <div
              className={cn(
                'flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6',
                isDark ? 'border-[#18263b]' : 'border-slate-200',
              )}
            >
              <Button
                type="button"
                variant="outline"
                className={adminOutlineButtonClass(isDark)}
                disabled={testMutation.isPending}
                onClick={() => testMutation.mutate()}
              >
                {testMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Test connection
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className={adminOutlineButtonClass(isDark)}
                  onClick={closeModal}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#f26522] text-white hover:bg-[#d94e0f]"
                  disabled={saveMutation.isPending || !canSave}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingId ? 'Save changes' : 'Save SMTP account'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
