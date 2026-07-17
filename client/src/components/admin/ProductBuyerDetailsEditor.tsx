import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
  const [draft, setDraft] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const updateItems = (nextItems: string[]) => {
    const serialized = serializeProductDetailLines(nextItems);
    onChange(serialized, nextItems.length);
  };

  const startEditing = (index: number) => {
    setEditIndex(index);
    setDraft(items[index] ?? '');
  };

  const cancelEditing = () => {
    setEditIndex(null);
    setDraft('');
  };

  const handleAddItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error('Enter buyer details before adding an item.');
      return;
    }

    updateItems([...items, trimmed]);
    setDraft('');
    setEditIndex(null);
    toast.success(`Item ${items.length + 1} added.`);
  };

  const handleSaveChanges = () => {
    if (editIndex === null) return;

    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error('Buyer details cannot be empty.');
      return;
    }

    const nextItems = items.map((item, index) => (index === editIndex ? trimmed : item));
    updateItems(nextItems);
    setEditIndex(null);
    setDraft('');
    toast.success(`Item ${editIndex + 1} updated.`);
  };

  const handleRemoveItem = (index: number) => {
    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
    updateItems(nextItems);

    if (editIndex === index) {
      setEditIndex(null);
      setDraft('');
    } else if (editIndex !== null && editIndex > index) {
      setEditIndex(editIndex - 1);
    }
  };

  const isEditing = editIndex !== null;
  const nextItemNumber = items.length + 1;

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className={cn('block text-sm', adminMutedTextClass(isDark))}>
          Product details for buyer copy
        </label>
        <span className={cn(
          'rounded-full border px-3 py-1 text-xs',
          isDark ? 'border-[#1f3550] bg-[#0a1628] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600',
        )}>
          {items.length} {items.length === 1 ? 'item' : 'items'} saved
        </span>
      </div>

      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-2">
          <label className={cn('block text-xs font-medium uppercase tracking-wide', adminSubtleTextClass(isDark))}>
            Saved items
          </label>

          <div className={cn(
            'max-h-[280px] space-y-2 overflow-y-auto overflow-x-hidden rounded-xl border p-2',
            isDark ? 'border-[#18263b] bg-[#081624]' : 'border-slate-200 bg-slate-50',
          )}>
            {items.length === 0 ? (
              <p className={cn('px-2 py-4 text-center text-xs', adminSubtleTextClass(isDark))}>
                No items yet. Type details on the right and click Add item.
              </p>
            ) : (
              items.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    'min-w-0 rounded-lg border px-3 py-2',
                    editIndex === index
                      ? isDark
                        ? 'border-[#f26522] bg-[#10213a]'
                        : 'border-[#f26522] bg-white shadow-sm'
                      : isDark
                        ? 'border-[#22324a] bg-[#06101d]'
                        : 'border-slate-200 bg-white',
                  )}
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(index)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className={cn('text-xs font-semibold', adminStrongTextClass(isDark))}>
                        Item {index + 1}
                      </p>
                      <p className={cn('mt-1 line-clamp-2 break-words text-xs', adminMutedTextClass(isDark))}>
                        {item.trim()}
                      </p>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEditing(index)}
                        className={cn(
                          'rounded-md p-1.5 transition-colors',
                          isDark ? 'text-slate-400 hover:bg-[#0b1728] hover:text-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                        )}
                        aria-label={`Edit item ${index + 1}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-500/10"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="min-w-0">
          <label className={cn('mb-2 block text-xs font-medium uppercase tracking-wide', adminSubtleTextClass(isDark))}>
            {isEditing ? `Edit item ${editIndex + 1}` : `Add item ${nextItemNumber}`}
          </label>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="admin-textarea min-h-[220px] min-w-0 text-sm leading-6"
            placeholder={'Username: john\nPassword: secret123\nEmail: john@mail.com\n\nEnter details for one buyer, then click Add item.'}
          />
          <p className={cn('mt-2 text-xs', adminSubtleTextClass(isDark))}>
            {isEditing
              ? 'Update the selected item, or cancel to add a new one.'
              : 'Type details for one buyer, click Add item, then repeat for the next buyer copy.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <Button type="button" className="bg-[#f26522] hover:bg-[#d94e0f]" onClick={handleSaveChanges}>
                  Save changes
                </Button>
                <Button type="button" variant="outline" className={isDark ? 'border-[#22324a]' : ''} onClick={cancelEditing}>
                  Cancel edit
                </Button>
              </>
            ) : (
              <Button type="button" className="bg-[#f26522] hover:bg-[#d94e0f]" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add item
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
