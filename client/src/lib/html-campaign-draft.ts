const DRAFT_KEY = 'nexlogs_html_campaign_draft';

export interface HtmlCampaignDraft {
  subject: string;
  htmlBody: string;
  templateName: string;
  selectedRecipientIds: string[];
  selectedExternalEmails: string[];
  savedAt: string;
}

export function loadHtmlCampaignDraft(): HtmlCampaignDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HtmlCampaignDraft;
  } catch {
    return null;
  }
}

export function saveHtmlCampaignDraft(draft: Omit<HtmlCampaignDraft, 'savedAt'>) {
  const payload: HtmlCampaignDraft = { ...draft, savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  return payload;
}

export function clearHtmlCampaignDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
