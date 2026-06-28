import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { APP_NAME } from '@/constants';
import { loadBroadcastDraft } from '@/lib/broadcast-draft';
import { loadHtmlCampaignDraft } from '@/lib/html-campaign-draft';
import {
  DEFAULT_HTML_CAMPAIGN_SUBJECT,
  HTML_CAMPAIGN_TEMPLATES,
} from '@/lib/html-campaign-templates';

const STORAGE_KEY = 'nexlogs_email_sender_session';
const DEFAULT_SUBJECT = `New products available on ${APP_NAME}`;
const defaultTemplate = HTML_CAMPAIGN_TEMPLATES[0];

export interface EmailSenderSessionState {
  broadcast: {
    subject: string;
    customMessage: string;
    selectedProductIds: string[];
    selectedRecipientIds: string[];
    minimized: boolean;
    expanded: boolean;
    productsPanelOpen: boolean;
    previewInlineOpen: boolean;
  };
  htmlCampaign: {
    subject: string;
    htmlBody: string;
    templateName: string;
    selectedRecipientIds: string[];
    minimized: boolean;
    expanded: boolean;
    previewExpanded: boolean;
    previewInlineOpen: boolean;
  };
}

function buildInitialState(): EmailSenderSessionState {
  const broadcastDraft = loadBroadcastDraft();
  const htmlDraft = loadHtmlCampaignDraft();
  const stored = readStoredState();

  return {
    broadcast: {
      subject: broadcastDraft?.subject || stored?.broadcast.subject || DEFAULT_SUBJECT,
      customMessage: broadcastDraft?.customMessage || stored?.broadcast.customMessage || '',
      selectedProductIds: broadcastDraft?.selectedProductIds || stored?.broadcast.selectedProductIds || [],
      selectedRecipientIds:
        broadcastDraft?.selectedRecipientIds || stored?.broadcast.selectedRecipientIds || [],
      minimized: stored?.broadcast.minimized ?? true,
      expanded: stored?.broadcast.expanded ?? false,
      productsPanelOpen: stored?.broadcast.productsPanelOpen ?? true,
      previewInlineOpen: stored?.broadcast.previewInlineOpen ?? false,
    },
    htmlCampaign: {
      subject: htmlDraft?.subject || stored?.htmlCampaign.subject || DEFAULT_HTML_CAMPAIGN_SUBJECT,
      htmlBody: htmlDraft?.htmlBody || stored?.htmlCampaign.htmlBody || defaultTemplate.html,
      templateName: htmlDraft?.templateName || stored?.htmlCampaign.templateName || defaultTemplate.id,
      selectedRecipientIds:
        htmlDraft?.selectedRecipientIds || stored?.htmlCampaign.selectedRecipientIds || [],
      minimized: stored?.htmlCampaign.minimized ?? true,
      expanded: stored?.htmlCampaign.expanded ?? false,
      previewExpanded: stored?.htmlCampaign.previewExpanded ?? false,
      previewInlineOpen: stored?.htmlCampaign.previewInlineOpen ?? false,
    },
  };
}

function readStoredState(): EmailSenderSessionState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EmailSenderSessionState;
  } catch {
    return null;
  }
}

function writeStoredState(state: EmailSenderSessionState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface EmailSenderStateContextValue {
  state: EmailSenderSessionState;
  updateBroadcast: (patch: Partial<EmailSenderSessionState['broadcast']>) => void;
  updateHtmlCampaign: (patch: Partial<EmailSenderSessionState['htmlCampaign']>) => void;
  resetBroadcast: () => void;
  resetHtmlCampaign: () => void;
}

const EmailSenderStateContext = createContext<EmailSenderStateContextValue | null>(null);

export function EmailSenderStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EmailSenderSessionState>(() => buildInitialState());

  useEffect(() => {
    writeStoredState(state);
  }, [state]);

  const updateBroadcast = useCallback((patch: Partial<EmailSenderSessionState['broadcast']>) => {
    setState((current) => ({
      ...current,
      broadcast: { ...current.broadcast, ...patch },
    }));
  }, []);

  const updateHtmlCampaign = useCallback((patch: Partial<EmailSenderSessionState['htmlCampaign']>) => {
    setState((current) => ({
      ...current,
      htmlCampaign: { ...current.htmlCampaign, ...patch },
    }));
  }, []);

  const resetBroadcast = useCallback(() => {
    setState((current) => ({
      ...current,
      broadcast: {
        subject: DEFAULT_SUBJECT,
        customMessage: '',
        selectedProductIds: [],
        selectedRecipientIds: [],
        minimized: true,
        expanded: false,
        productsPanelOpen: true,
        previewInlineOpen: false,
      },
    }));
  }, []);

  const resetHtmlCampaign = useCallback(() => {
    setState((current) => ({
      ...current,
      htmlCampaign: {
        subject: DEFAULT_HTML_CAMPAIGN_SUBJECT,
        htmlBody: defaultTemplate.html,
        templateName: defaultTemplate.id,
        selectedRecipientIds: [],
        minimized: true,
        expanded: false,
        previewExpanded: false,
        previewInlineOpen: false,
      },
    }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      updateBroadcast,
      updateHtmlCampaign,
      resetBroadcast,
      resetHtmlCampaign,
    }),
    [state, updateBroadcast, updateHtmlCampaign, resetBroadcast, resetHtmlCampaign],
  );

  return (
    <EmailSenderStateContext.Provider value={value}>{children}</EmailSenderStateContext.Provider>
  );
}

export function useEmailSenderState() {
  const context = useContext(EmailSenderStateContext);
  if (!context) {
    throw new Error('useEmailSenderState must be used within EmailSenderStateProvider');
  }
  return context;
}
