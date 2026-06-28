const DRAFT_KEY = 'nexlogs_broadcast_draft';

export interface BroadcastDraft {
  subject: string;
  customMessage: string;
  selectedProductIds: string[];
  selectedRecipientIds: string[];
  savedAt: string;
}

export function loadBroadcastDraft(): BroadcastDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BroadcastDraft;
  } catch {
    return null;
  }
}

export function saveBroadcastDraft(draft: Omit<BroadcastDraft, 'savedAt'>) {
  const payload: BroadcastDraft = { ...draft, savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  return payload;
}

export function clearBroadcastDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
