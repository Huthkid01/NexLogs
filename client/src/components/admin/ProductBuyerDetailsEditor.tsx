import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  adminMutedTextClass,
  adminSubtleTextClass,
  adminStrongTextClass,
} from '@/lib/admin-theme';
import { parseProductDetailLines, serializeProductDetailLines } from '@/lib/product-details';
import { cn } from '@/lib/utils';

interface ProductBuyerDetailsEditorProps {
  value: string;
  onChange: (value: string, lineCount: number) => void;
  isDark: boolean;
}

export function ProductBuyerDetailsEditor({ value, onChange, isDark }: ProductBuyerDetailsEditorProps) {
  const items = useMemo(() => parseProductDetailLines(value), [value]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedIndex(0);
      return;
    }

    if (selectedIndex > items.length - 1) {
      setSelectedIndex(items.length - 1);
    }
  }, [items.length, selectedIndex]);

  const updateItems = (nextItems: string[]) => {
    const serialized = serializeProductDetailLines(nextItems);
    onChange(serialized, nextItems.length);
  };

  const handleItemChange = (text: string) => {
    if (items.length === 0) {
      updateItems(text.trim() ? [text.trim()] : []);
      return;
    }

    const nextItems = items.map((item, index) => (index === selectedIndex ? text : item));
    updateItems(nextItems);
  };

  const handleAddItem = () => {
    const nextItems = [...items, ''];
    updateItems(nextItems);
    setSelectedIndex(nextItems.length - 1);
  };

  const handleRemoveItem = () => {
    if (items.length === 0) return;
    const nextItems = items.filter((_, index) => index !== selectedIndex);
    updateItems(nextItems);
    setSelectedIndex(Math.max(0, selectedIndex - 1));
  };

  const selectedItem = items[selectedIndex] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className={cn('block text-sm', adminMutedTextClass(isDark))}>
          Product details for buyer copy
        </label>
        <span className={cn(
          'rounded-full border px-3 py-1 text-xs',
          isDark ? 'border-[#1f3550] bg-[#0a1628] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600',
        )}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <label className={cn('block text-xs font-medium uppercase tracking-wide', adminSubtleTextClass(isDark))}>
            Select item
          </label>
          <select
            value={items.length === 0 ? '' : String(selectedIndex)}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            className="admin-select w-full"
            disabled={items.length === 0}
          >
            {items.length === 0 ? (
              <option value="">No items yet</option>
            ) : (
              items.map((item, index) => (
                <option key={index} value={String(index)}>
                  Item {index + 1}
                  {item.trim() ? `: ${item.trim().slice(0, 40)}${item.trim().length > 40 ? '…' : ''}` : ' (empty)'}
                </option>
              ))
            )}
          </select>

          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" className={cn('justify-start', isDark ? 'border-[#22324a]' : '')} onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add item
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn('justify-start text-red-500 hover:text-red-600', isDark ? 'border-[#22324a]' : '')}
              onClick={handleRemoveItem}
              disabled={items.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove item
            </Button>
          </div>
        </div>

        <div>
          <label className={cn('mb-2 block text-xs font-medium uppercase tracking-wide', adminSubtleTextClass(isDark))}>
            Details for selected buyer
          </label>
          <Textarea
            value={selectedItem}
            onChange={(event) => handleItemChange(event.target.value)}
            className="admin-textarea min-h-[220px] text-sm leading-6"
            placeholder={'Username: john\nPassword: secret123\nEmail: john@mail.com\n\nOr paste any buyer copy for this single item.'}
          />
          <p className={cn('mt-2 text-xs', adminSubtleTextClass(isDark))}>
            Add one item at a time. Each item is delivered to one buyer when purchased. Stock matches the item count.
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className={cn(
          'rounded-xl border px-4 py-3',
          isDark ? 'border-[#18263b] bg-[#081624]' : 'border-slate-200 bg-slate-50',
        )}>
          <p className={cn('text-xs font-semibold uppercase tracking-wide', adminStrongTextClass(isDark))}>
            Saved items preview
          </p>
          <div className="mt-2 space-y-1">
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'block w-full rounded-lg px-3 py-2 text-left text-xs transition-colors',
                  index === selectedIndex
                    ? isDark
                      ? 'bg-[#10213a] text-slate-100'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:bg-[#0b1728] hover:text-slate-200'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900',
                )}
              >
                <span className="font-semibold">Item {index + 1}:</span>{' '}
                {item.trim() || '(empty)'}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
