import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminInputClass } from '@/lib/admin-theme';
import { convertCurrencyToUsd, convertUsdToCurrency, type WalletExchangeRates } from '@/lib/wallet-exchange-rates';
import { cn } from '@/lib/utils';

interface AdminDualCurrencyPriceInputProps {
  usdAmount: number;
  onUsdChange: (usd: number) => void;
  rates: WalletExchangeRates;
  usdLabel?: string;
  ngnLabel?: string;
  className?: string;
  isDark?: boolean;
}

function roundUsd(amount: number) {
  return Math.round(amount * 100) / 100;
}

function roundNgn(amount: number) {
  return Math.round(amount);
}

export function AdminDualCurrencyPriceInput({
  usdAmount,
  onUsdChange,
  rates,
  usdLabel = 'Price (USD)',
  ngnLabel = 'Price (NGN)',
  className,
  isDark = false,
}: AdminDualCurrencyPriceInputProps) {
  const ngnRate = rates.NGN ?? 1500;
  const [usdInput, setUsdInput] = useState(() => String(usdAmount || ''));
  const [ngnInput, setNgnInput] = useState(() => String(roundNgn(convertUsdToCurrency(usdAmount, ngnRate)) || ''));

  useEffect(() => {
    setUsdInput(usdAmount ? String(usdAmount) : '');
    setNgnInput(usdAmount ? String(roundNgn(convertUsdToCurrency(usdAmount, ngnRate))) : '');
  }, [usdAmount, ngnRate]);

  const handleUsdChange = (value: string) => {
    setUsdInput(value);
    if (value.trim() === '') {
      setNgnInput('');
      onUsdChange(0);
      return;
    }

    const usd = Number(value);
    if (Number.isNaN(usd) || usd < 0) return;

    const ngn = roundNgn(convertUsdToCurrency(usd, ngnRate));
    setNgnInput(ngn ? String(ngn) : '');
    onUsdChange(roundUsd(usd));
  };

  const handleNgnChange = (value: string) => {
    setNgnInput(value);
    if (value.trim() === '') {
      setUsdInput('');
      onUsdChange(0);
      return;
    }

    const ngn = Number(value);
    if (Number.isNaN(ngn) || ngn < 0) return;

    const usd = convertCurrencyToUsd(ngn, 'NGN', rates);
    setUsdInput(usd ? String(usd) : '');
    onUsdChange(usd);
  };

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      <div>
        <Label>{usdLabel}</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={usdInput}
          onChange={(event) => handleUsdChange(event.target.value)}
          className={adminInputClass(isDark)}
          placeholder="10.00"
        />
      </div>
      <div>
        <Label>{ngnLabel}</Label>
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
    </div>
  );
}
