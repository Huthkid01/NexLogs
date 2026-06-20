import { useEffect, useState } from 'react';
import { ArrowUpDown, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { defaultSiteContent } from '@/contexts/site-content';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useTheme } from '@/hooks/useTheme';
import {
  adminInputClass,
  adminMainCardClass,
  adminMutedTextClass,
  adminPageClass,
  adminStrongTextClass,
} from '@/lib/admin-theme';
import {
  ADMIN_RATE_FIELDS,
  formatRatePerUsd,
  normalizeWalletExchangeRates,
  type WalletExchangeRates,
} from '@/lib/wallet-exchange-rates';

export default function AdminExchangeRatesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { content, setContent } = useSiteContent();
  const [rates, setRates] = useState<WalletExchangeRates>(() =>
    normalizeWalletExchangeRates(content.wallet.exchangeRates),
  );

  useEffect(() => {
    setRates(normalizeWalletExchangeRates(content.wallet.exchangeRates));
  }, [content.wallet.exchangeRates]);

  const handleRateChange = (code: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setRates((current) => ({
        ...current,
        [code]: value === '' ? 0 : Number(value),
      }));
    }
  };

  const saveRates = () => {
    const normalized = normalizeWalletExchangeRates(rates);

    for (const field of ADMIN_RATE_FIELDS) {
      const rate = normalized[field.code];
      if (!rate || rate <= 0) {
        toast.error(`${field.label} must be greater than zero.`);
        return;
      }
    }

    setContent({
      ...content,
      wallet: {
        exchangeRates: normalized,
      },
    });
    toast.success('Exchange rates updated.');
  };

  const resetRates = () => {
    const defaults = normalizeWalletExchangeRates(defaultSiteContent.wallet.exchangeRates);
    setRates(defaults);
    setContent({
      ...content,
      wallet: {
        exchangeRates: defaults,
      },
    });
    toast.success('Exchange rates reset to defaults.');
  };

  return (
    <div className={`space-y-6 ${adminPageClass(isDark)}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${adminStrongTextClass(isDark)}`}>Exchange Rates</h1>
          <p className={`mt-1 text-sm ${adminMutedTextClass(isDark)}`}>
            Set how local currencies convert to USD when customers add funds or check rates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={resetRates}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button type="button" onClick={saveRates}>
            <Save className="h-4 w-4 mr-2" />
            Save Rates
          </Button>
        </div>
      </div>

      <Card className={adminMainCardClass(isDark)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            Wallet Conversion Rates
          </CardTitle>
          <CardDescription className={adminMutedTextClass(isDark)}>
            Each value is how much of that currency equals 1 USD. Example: 1500 NGN means ₦1,500 = $1.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {ADMIN_RATE_FIELDS.map((field) => (
            <div key={field.code} className="grid gap-2 md:grid-cols-[220px_1fr] md:items-start">
              <div>
                <Label htmlFor={`rate-${field.code}`}>{field.label}</Label>
                <p className={`mt-1 text-xs ${adminMutedTextClass(isDark)}`}>{field.helper}</p>
              </div>
              <div className="space-y-2">
                <Input
                  id={`rate-${field.code}`}
                  type="text"
                  inputMode="decimal"
                  value={rates[field.code] ?? ''}
                  onChange={(event) => handleRateChange(field.code, event.target.value)}
                  className={adminInputClass(isDark)}
                />
                <p className={`text-xs ${adminMutedTextClass(isDark)}`}>
                  {formatRatePerUsd(field.code, rates[field.code] ?? 0)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
