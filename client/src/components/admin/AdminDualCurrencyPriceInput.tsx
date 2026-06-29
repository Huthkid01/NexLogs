import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminInputClass } from '@/lib/admin-theme';
import { cn } from '@/lib/utils';

interface AdminNgnPriceInputProps {
  ngnAmount: number;
  onNgnChange: (ngn: number) => void;
  label?: string;
  className?: string;
  isDark?: boolean;
}

function roundNgn(amount: number) {
  return Math.round(amount);
}

export function AdminDualCurrencyPriceInput({
  ngnAmount,
  onNgnChange,
  label = 'Price (NGN)',
  className,
  isDark = false,
}: AdminNgnPriceInputProps) {
  const [ngnInput, setNgnInput] = useState(() => String(ngnAmount || ''));

  useEffect(() => {
    setNgnInput(ngnAmount ? String(roundNgn(ngnAmount)) : '');
  }, [ngnAmount]);

  const handleNgnChange = (value: string) => {
    setNgnInput(value);
    if (value.trim() === '') {
      onNgnChange(0);
      return;
    }

    const ngn = Number(value);
    if (Number.isNaN(ngn) || ngn < 0) return;
    onNgnChange(roundNgn(ngn));
  };

  return (
    <div className={cn(className)}>
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        step="1"
        value={ngnInput}
        onChange={(event) => handleNgnChange(event.target.value)}
        className={adminInputClass(isDark)}
        placeholder="15000"
      />
    </div>
  );
}
