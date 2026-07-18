import { useMemo, useRef, useState } from 'react';
import type { BroadcastRecipientSelection } from '@/components/admin/BroadcastRecipientPicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BroadcastComposer } from '@/components/admin/BroadcastComposer';
import { BroadcastPreviewModal } from '@/components/admin/BroadcastPreviewModal';
import {
  BroadcastSendFlowModal,
  type BroadcastSendPhase,
} from '@/components/admin/BroadcastSendFlowModal';
import { HtmlCampaignComposer } from '@/components/admin/HtmlCampaignComposer';
import { HtmlCampaignPreviewModal } from '@/components/admin/HtmlCampaignPreviewModal';
import { EmailMarketingOverview } from '@/components/admin/EmailMarketingOverview';
import { MarketingSmtpManager } from '@/components/admin/MarketingSmtpManager';
import { useBroadcastDeliverability } from '@/components/admin/BroadcastEmailPreview';
import { useHtmlCampaignDeliverability } from '@/components/admin/HtmlCampaignEmailPreview';
import { useEmailSenderState } from '@/contexts/EmailSenderStateContext';
import { broadcastEmailService, htmlCampaignService, marketingTrackingService } from '@/services';
import type { BroadcastEmailPayload, EmailBroadcastRecord } from '@/services/broadcast-email.service';
import type { EmailCampaignRecord, HtmlCampaignPayload } from '@/services/html-campaign.service';
import { productService } from '@/services';
import { clearBroadcastDraft } from '@/lib/broadcast-draft';
import { clearHtmlCampaignDraft } from '@/lib/html-campaign-draft';
import { buildMarketingRecipientPayload } from '@/lib/marketing-recipient-payload';
import {
  resolveMarketingSendRecipients,
  type MarketingSendProgressItem,
} from '@/lib/marketing-send-recipients';
import { runSequentialEmailSend, type SequentialSendProgressInfo } from '@/lib/marketing-sequential-send';
import type { MarketingSendRecipient } from '@/lib/marketing-send-recipients';
import { DEFAULT_MARKETING_SMTP_ID } from '@/services/marketing-smtp.service';
import { APP_NAME } from '@/constants';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

const DEFAULT_SUBJECT = `New products available on ${APP_NAME}`;

function resolveBroadcastProducts(
  broadcast: EmailBroadcastRecord,
  allProducts: Product[] | undefined,
) {
  const byId = new Map((allProducts ?? []).map((product) => [product.id, product]));

  return broadcast.product_ids.map((id) => {
    const product = byId.get(id);
    if (product) {
      return { title: product.title, slug: product.slug, price: product.price };
    }
    return { title: 'Removed product', slug: id, price: 0 };
  });
}

export default function AdminSenderPage() {
  const queryClient = useQueryClient();
  const { state, updateBroadcast, updateHtmlCampaign } = useEmailSenderState();
  const {
    subject,
    customMessage,
    selectedProductIds,
    selectedRecipientIds,
    selectedExternalEmails,
  } = state.broadcast;
  const {
    subject: htmlSubject,
    htmlBody,
    templateName: htmlTemplateName,
    selectedRecipientIds: htmlRecipientIds,
    selectedExternalEmails: htmlExternalEmails,
  } = state.htmlCampaign;

  const [sendFlowOpen, setSendFlowOpen] = useState(false);
  const [sendPhase, setSendPhase] = useState<BroadcastSendPhase>('confirm');
  const [sendError, setSendError] = useState('');
  const [sendResult, setSendResult] = useState({ sentCount: 0, failedCount: 0, cancelled: false });
  const [sendProgress, setSendProgress] = useState<MarketingSendProgressItem[]>([]);
  const [currentSendEmail, setCurrentSendEmail] = useState<string | null>(null);
  const [sendInfo, setSendInfo] = useState<SequentialSendProgressInfo | null>(null);
  const [historyPreview, setHistoryPreview] = useState<EmailBroadcastRecord | null>(null);

  const [htmlSendFlowOpen, setHtmlSendFlowOpen] = useState(false);
  const [htmlSendPhase, setHtmlSendPhase] = useState<BroadcastSendPhase>('confirm');
  const [htmlSendError, setHtmlSendError] = useState('');
  const [htmlSendResult, setHtmlSendResult] = useState({ sentCount: 0, failedCount: 0, cancelled: false });
  const [htmlSendProgress, setHtmlSendProgress] = useState<MarketingSendProgressItem[]>([]);
  const [htmlCurrentSendEmail, setHtmlCurrentSendEmail] = useState<string | null>(null);
  const [htmlSendInfo, setHtmlSendInfo] = useState<SequentialSendProgressInfo | null>(null);
  const [htmlHistoryPreview, setHtmlHistoryPreview] = useState<EmailCampaignRecord | null>(null);
  const [broadcastRecipientCount, setBroadcastRecipientCount] = useState(0);
  const [htmlRecipientCount, setHtmlRecipientCount] = useState(0);
  const broadcastSendSelectionRef = useRef<BroadcastRecipientSelection | null>(null);
  const htmlSendSelectionRef = useRef<BroadcastRecipientSelection | null>(null);
  const broadcastAbortRef = useRef<AbortController | null>(null);
  const htmlAbortRef = useRef<AbortController | null>(null);
  const [selectedSmtpAccountId, setSelectedSmtpAccountId] = useState(DEFAULT_MARKETING_SMTP_ID);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: productService.getAllAdmin,
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['broadcast-contacts'],
    queryFn: broadcastEmailService.getEligibleRecipients,
  });

  const { data: broadcasts, isLoading: broadcastsLoading } = useQuery({
    queryKey: ['email-broadcasts'],
    queryFn: () => broadcastEmailService.getRecentBroadcasts(8),
  });

  const { data: htmlCampaigns, isLoading: htmlCampaignsLoading } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => htmlCampaignService.getRecentCampaigns(8),
  });

  const sendToAll =
    selectedRecipientIds.length > 0 &&
    selectedRecipientIds.length === (contacts?.length ?? 0) &&
    selectedExternalEmails.length === 0;
  const htmlSendToAll =
    htmlRecipientIds.length > 0 &&
    htmlRecipientIds.length === (contacts?.length ?? 0) &&
    htmlExternalEmails.length === 0;
  const sendCount = selectedRecipientIds.length + selectedExternalEmails.length;
  const htmlSendCount = htmlRecipientIds.length + htmlExternalEmails.length;
  const effectiveBroadcastRecipientCount = Math.max(sendCount, broadcastRecipientCount);
  const effectiveHtmlRecipientCount = Math.max(htmlSendCount, htmlRecipientCount);
  const deliverability = useBroadcastDeliverability(subject, customMessage, selectedProductIds.length);
  const htmlDeliverability = useHtmlCampaignDeliverability(
    htmlSubject,
    htmlBody,
    effectiveHtmlRecipientCount,
  );

  const contactList = contacts ?? [];

  const sendBroadcast = useMutation({
    mutationFn: (payload: BroadcastEmailPayload) => broadcastEmailService.send(payload),
  });

  const sendHtmlCampaign = useMutation({
    mutationFn: (payload: HtmlCampaignPayload) => htmlCampaignService.send(payload),
  });

  const canSend =
    selectedProductIds.length > 0 &&
    effectiveBroadcastRecipientCount > 0 &&
    deliverability.canSend;

  const canSendHtml =
    effectiveHtmlRecipientCount > 0 &&
    htmlDeliverability.canSend;

  const historyPreviewProducts = useMemo(
    () => (historyPreview ? resolveBroadcastProducts(historyPreview, products) : []),
    [historyPreview, products],
  );

  const openSendFlow = () => {
    setSendError('');
    setSendResult({ sentCount: 0, failedCount: 0, cancelled: false });
    setSendProgress([]);
    setCurrentSendEmail(null);
    setSendInfo(null);
    setSendPhase('confirm');
    setSendFlowOpen(true);
  };

  const closeSendFlow = () => {
    if (sendPhase === 'sending') return;
    setSendFlowOpen(false);
    setSendPhase('confirm');
    setSendError('');
    setSendInfo(null);
  };

  const cancelBroadcastSend = () => {
    broadcastAbortRef.current?.abort();
  };

  const openHtmlSendFlow = () => {
    setHtmlSendError('');
    setHtmlSendResult({ sentCount: 0, failedCount: 0, cancelled: false });
    setHtmlSendProgress([]);
    setHtmlCurrentSendEmail(null);
    setHtmlSendInfo(null);
    setHtmlSendPhase('confirm');
    setHtmlSendFlowOpen(true);
  };

  const closeHtmlSendFlow = () => {
    if (htmlSendPhase === 'sending') return;
    setHtmlSendFlowOpen(false);
    setHtmlSendPhase('confirm');
    setHtmlSendError('');
    setHtmlSendInfo(null);
  };

  const cancelHtmlSend = () => {
    htmlAbortRef.current?.abort();
  };

  const buildSingleRecipientPayload = (recipient: MarketingSendRecipient) => {
    if (recipient.userId) {
      return {
        recipient_user_ids: [recipient.userId],
        recipient_emails: undefined,
        send_to_all: false as const,
      };
    }

    return {
      recipient_user_ids: undefined,
      recipient_emails: [recipient.email],
      send_to_all: false as const,
    };
  };

  const handleConfirmSend = async () => {
    setSendPhase('sending');
    const abortController = new AbortController();
    broadcastAbortRef.current = abortController;
    try {
      const selection = broadcastSendSelectionRef.current;
      const userIds = selection?.userIds ?? selectedRecipientIds;
      const externalEmails = selection?.externalEmails ?? selectedExternalEmails;
      const recipientPayload = buildMarketingRecipientPayload(
        contactList,
        userIds,
        externalEmails,
        sendToAll,
      );
      const recipients = resolveMarketingSendRecipients(
        contactList,
        userIds,
        externalEmails,
        sendToAll,
      );

      if (!recipients.length) {
        throw new Error('Add at least one recipient in the To field.');
      }

      setSendProgress(recipients.map((recipient) => ({ ...recipient, status: 'pending' })));

      const subject = deliverability.sanitizedSubject || DEFAULT_SUBJECT;
      const customMessage = deliverability.sanitizedMessage || undefined;

      const batchId = await broadcastEmailService.createBroadcastDraft({
        subject,
        product_ids: selectedProductIds,
        custom_message: customMessage ?? null,
        recipient_count: recipients.length,
        recipient_user_ids: recipientPayload.recipient_user_ids,
        recipient_emails: recipientPayload.recipient_emails,
      });

      const result = await runSequentialEmailSend({
        recipients,
        signal: abortController.signal,
        buildPayload: (recipient) => ({
          product_ids: selectedProductIds,
          subject,
          custom_message: customMessage,
          skip_history: true,
          smtp_account_id:
            selectedSmtpAccountId === DEFAULT_MARKETING_SMTP_ID ? null : selectedSmtpAccountId,
          ...buildSingleRecipientPayload(recipient),
        }),
        send: async (recipient, payload) => {
          const sendRecord = await marketingTrackingService.createSend({
            source_type: 'broadcast',
            source_id: batchId,
            recipient_email: recipient.email,
            recipient_user_id: recipient.userId,
          });
          try {
            await sendBroadcast.mutateAsync({
              ...payload,
              tracking_token: sendRecord.tracking_token,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Send failed';
            await marketingTrackingService.markSendFailed(sendRecord.tracking_token, message);
            throw error;
          }
        },
        onProgress: (items, currentEmail, info) => {
          setSendProgress(items);
          setCurrentSendEmail(currentEmail);
          setSendInfo(info);
        },
      });

      await broadcastEmailService.finalizeBroadcast(batchId, {
        sent_count: result.sentCount,
        failed_count: result.failedCount,
      });

      void queryClient.invalidateQueries({ queryKey: ['email-broadcasts'] });
      void queryClient.invalidateQueries({ queryKey: ['email-marketing-overview'] });
      clearBroadcastDraft();
      setSendResult({
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        cancelled: result.cancelled,
      });
      setSendPhase('success');
      if (result.cancelled) {
        toast.message(`Sending cancelled. ${result.sentCount} email(s) already sent.`);
      } else if (result.failedCount > 0) {
        toast.warning(`Sent ${result.sentCount} emails. ${result.failedCount} failed.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send announcement';
      setSendError(message);
      setSendPhase('error');
      toast.error(message);
    } finally {
      broadcastAbortRef.current = null;
      setCurrentSendEmail(null);
      setSendInfo(null);
    }
  };

  const handleConfirmHtmlSend = async () => {
    setHtmlSendPhase('sending');
    const abortController = new AbortController();
    htmlAbortRef.current = abortController;
    try {
      const selection = htmlSendSelectionRef.current;
      const userIds = selection?.userIds ?? htmlRecipientIds;
      const externalEmails = selection?.externalEmails ?? htmlExternalEmails;
      const recipientPayload = buildMarketingRecipientPayload(
        contactList,
        userIds,
        externalEmails,
        htmlSendToAll,
      );
      const recipients = resolveMarketingSendRecipients(
        contactList,
        userIds,
        externalEmails,
        htmlSendToAll,
      );

      if (!recipients.length) {
        throw new Error('Add at least one recipient in the To field.');
      }

      setHtmlSendProgress(recipients.map((recipient) => ({ ...recipient, status: 'pending' })));

      const subject = htmlDeliverability.sanitizedSubject || htmlSubject.trim();
      const sanitizedHtmlBody = htmlDeliverability.sanitizedHtml || htmlBody;

      const batchId = await htmlCampaignService.createCampaignDraft({
        subject,
        html_body: sanitizedHtmlBody,
        template_name: htmlTemplateName,
        recipient_count: recipients.length,
        recipient_user_ids: recipientPayload.recipient_user_ids,
        recipient_emails: recipientPayload.recipient_emails,
      });

      const result = await runSequentialEmailSend({
        recipients,
        signal: abortController.signal,
        buildPayload: (recipient) => ({
          subject,
          html_body: sanitizedHtmlBody,
          template_name: htmlTemplateName,
          skip_history: true,
          smtp_account_id:
            selectedSmtpAccountId === DEFAULT_MARKETING_SMTP_ID ? null : selectedSmtpAccountId,
          ...buildSingleRecipientPayload(recipient),
        }),
        send: async (recipient, payload) => {
          const sendRecord = await marketingTrackingService.createSend({
            source_type: 'campaign',
            source_id: batchId,
            recipient_email: recipient.email,
            recipient_user_id: recipient.userId,
          });
          try {
            await sendHtmlCampaign.mutateAsync({
              ...payload,
              tracking_token: sendRecord.tracking_token,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Send failed';
            await marketingTrackingService.markSendFailed(sendRecord.tracking_token, message);
            throw error;
          }
        },
        onProgress: (items, currentEmail, info) => {
          setHtmlSendProgress(items);
          setHtmlCurrentSendEmail(currentEmail);
          setHtmlSendInfo(info);
        },
      });

      await htmlCampaignService.finalizeCampaign(batchId, {
        sent_count: result.sentCount,
        failed_count: result.failedCount,
      });

      void queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      void queryClient.invalidateQueries({ queryKey: ['email-marketing-overview'] });
      clearHtmlCampaignDraft();
      setHtmlSendResult({
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        cancelled: result.cancelled,
      });
      setHtmlSendPhase('success');
      if (result.cancelled) {
        toast.message(`Sending cancelled. ${result.sentCount} email(s) already sent.`);
      } else if (result.failedCount > 0) {
        toast.warning(`Sent ${result.sentCount} emails. ${result.failedCount} failed.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send HTML campaign';
      setHtmlSendError(message);
      setHtmlSendPhase('error');
      toast.error(message);
    } finally {
      htmlAbortRef.current = null;
      setHtmlCurrentSendEmail(null);
      setHtmlSendInfo(null);
    }
  };

  const handleBroadcastResendToMissing = (ids: string[]) => {
    if (!historyPreview || !ids.length) return;
    updateBroadcast({
      subject: historyPreview.subject,
      customMessage: historyPreview.custom_message || '',
      selectedProductIds: historyPreview.product_ids,
      selectedRecipientIds: ids,
      minimized: false,
      expanded: true,
    });
    setHistoryPreview(null);
    toast.success(`Loaded ${ids.length} contact(s) in the product announcement composer.`);
  };

  const handleHtmlResendToMissing = (ids: string[]) => {
    if (!htmlHistoryPreview || !ids.length) return;
    updateHtmlCampaign({
      subject: htmlHistoryPreview.subject,
      htmlBody: htmlHistoryPreview.html_body,
      templateName: htmlHistoryPreview.template_name || htmlTemplateName,
      selectedRecipientIds: ids,
      minimized: false,
      expanded: true,
    });
    setHtmlHistoryPreview(null);
    toast.success(`Loaded ${ids.length} contact(s) in the HTML campaign composer.`);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-bold sm:text-2xl">Email Sender</h1>
        <p className="text-sm text-muted-foreground">
          Send product announcements or custom HTML campaigns. Choose the default SMTP or another account you add below.
          Use <strong>Account emails → inbox-friendly</strong> templates for the best chance of Primary inbox.
          Activation and password-reset emails still use the system SMTP and are not changed here.
        </p>
      </div>

      <MarketingSmtpManager
        selectedSmtpAccountId={selectedSmtpAccountId}
        onSelectedSmtpAccountIdChange={setSelectedSmtpAccountId}
      />

      <div className="flex w-full flex-col gap-3">
        <BroadcastComposer
          contacts={contactList}
          contactsLoading={contactsLoading}
          products={products ?? []}
          productsLoading={productsLoading}
          subject={subject}
          onSubjectChange={(value) => updateBroadcast({ subject: value })}
          customMessage={customMessage}
          onCustomMessageChange={(value) => updateBroadcast({ customMessage: value })}
          selectedProductIds={selectedProductIds}
          onSelectedProductIdsChange={(ids) => updateBroadcast({ selectedProductIds: ids })}
          selectedRecipientIds={selectedRecipientIds}
          onSelectedRecipientIdsChange={(ids) => updateBroadcast({ selectedRecipientIds: ids })}
          selectedExternalEmails={selectedExternalEmails}
          onSelectedExternalEmailsChange={(emails) => updateBroadcast({ selectedExternalEmails: emails })}
          onRecipientCountChange={setBroadcastRecipientCount}
          onPrepareSend={(selection) => {
            broadcastSendSelectionRef.current = selection;
          }}
          onSend={openSendFlow}
          sending={sendPhase === 'sending'}
          canSend={canSend}
        />

        <HtmlCampaignComposer
          contacts={contactList}
          contactsLoading={contactsLoading}
          subject={htmlSubject}
          onSubjectChange={(value) => updateHtmlCampaign({ subject: value })}
          htmlBody={htmlBody}
          onHtmlBodyChange={(value) => updateHtmlCampaign({ htmlBody: value })}
          templateName={htmlTemplateName}
          onTemplateNameChange={(value) => updateHtmlCampaign({ templateName: value })}
          selectedRecipientIds={htmlRecipientIds}
          onSelectedRecipientIdsChange={(ids) => updateHtmlCampaign({ selectedRecipientIds: ids })}
          selectedExternalEmails={htmlExternalEmails}
          onSelectedExternalEmailsChange={(emails) => updateHtmlCampaign({ selectedExternalEmails: emails })}
          onRecipientCountChange={setHtmlRecipientCount}
          onPrepareSend={(selection) => {
            htmlSendSelectionRef.current = selection;
          }}
          onSend={openHtmlSendFlow}
          sending={htmlSendPhase === 'sending'}
          canSend={canSendHtml}
        />
      </div>

      <EmailMarketingOverview />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Product broadcasts
            </CardTitle>
            <CardDescription>Click a broadcast to preview it or see who received it.</CardDescription>
          </CardHeader>
          <CardContent>
            {broadcastsLoading ? (
              <Skeleton className="h-24" />
            ) : !broadcasts?.length ? (
              <p className="text-sm text-muted-foreground">No product broadcasts sent yet.</p>
            ) : (
              <div className="space-y-3">
                {broadcasts.map((broadcast) => (
                  <button
                    key={broadcast.id}
                    type="button"
                    onClick={() => setHistoryPreview(broadcast)}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/40',
                      'sm:flex-row sm:items-center sm:justify-between',
                    )}
                  >
                    <div>
                      <p className="font-medium">{broadcast.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(broadcast.created_at).toLocaleString()} • {broadcast.product_ids.length} products
                      </p>
                    </div>
                    <p className="text-sm">
                      Sent {broadcast.sent_count}/{broadcast.recipient_count}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              HTML campaigns
            </CardTitle>
            <CardDescription>Click a campaign to preview it or see who received it.</CardDescription>
          </CardHeader>
          <CardContent>
            {htmlCampaignsLoading ? (
              <Skeleton className="h-24" />
            ) : !htmlCampaigns?.length ? (
              <p className="text-sm text-muted-foreground">No HTML campaigns sent yet.</p>
            ) : (
              <div className="space-y-3">
                {htmlCampaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setHtmlHistoryPreview(campaign)}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/40',
                      'sm:flex-row sm:items-center sm:justify-between',
                    )}
                  >
                    <div>
                      <p className="font-medium">{campaign.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(campaign.created_at).toLocaleString()}
                        {campaign.template_name ? ` • ${campaign.template_name}` : ''}
                      </p>
                    </div>
                    <p className="text-sm">
                      Sent {campaign.sent_count}/{campaign.recipient_count}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BroadcastPreviewModal
        open={!!historyPreview}
        onClose={() => setHistoryPreview(null)}
        subject={historyPreview?.subject ?? ''}
        customMessage={historyPreview?.custom_message ?? ''}
        products={historyPreviewProducts}
        title="Broadcast preview"
        description={
          historyPreview
            ? `Sent ${historyPreview.sent_count}/${historyPreview.recipient_count} on ${new Date(historyPreview.created_at).toLocaleString()}`
            : undefined
        }
        recipientUserIds={historyPreview?.recipient_user_ids ?? []}
        recipientEmails={historyPreview?.recipient_emails ?? []}
        contacts={contactList}
        failedCount={historyPreview?.failed_count ?? 0}
        onSelectMissingRecipients={handleBroadcastResendToMissing}
      />

      <HtmlCampaignPreviewModal
        open={!!htmlHistoryPreview}
        onClose={() => setHtmlHistoryPreview(null)}
        subject={htmlHistoryPreview?.subject ?? ''}
        htmlBody={htmlHistoryPreview?.html_body ?? ''}
        description={
          htmlHistoryPreview
            ? `Sent ${htmlHistoryPreview.sent_count}/${htmlHistoryPreview.recipient_count} on ${new Date(htmlHistoryPreview.created_at).toLocaleString()}`
            : undefined
        }
        recipientUserIds={htmlHistoryPreview?.recipient_user_ids ?? []}
        recipientEmails={htmlHistoryPreview?.recipient_emails ?? []}
        contacts={contactList}
        failedCount={htmlHistoryPreview?.failed_count ?? 0}
        onSelectMissingRecipients={handleHtmlResendToMissing}
      />

      <BroadcastSendFlowModal
        open={sendFlowOpen}
        phase={sendPhase}
        sendCount={Math.max(sendCount, effectiveBroadcastRecipientCount, sendProgress.length)}
        productCount={selectedProductIds.length}
        sentCount={sendResult.sentCount}
        failedCount={sendResult.failedCount}
        cancelled={sendResult.cancelled}
        errorMessage={sendError}
        sendProgress={sendProgress}
        currentSendEmail={currentSendEmail}
        sendInfo={sendInfo}
        onConfirmSend={() => void handleConfirmSend()}
        onCancelSend={cancelBroadcastSend}
        onClose={closeSendFlow}
      />

      <BroadcastSendFlowModal
        open={htmlSendFlowOpen}
        phase={htmlSendPhase}
        sendCount={Math.max(htmlSendCount, effectiveHtmlRecipientCount, htmlSendProgress.length)}
        sentCount={htmlSendResult.sentCount}
        failedCount={htmlSendResult.failedCount}
        cancelled={htmlSendResult.cancelled}
        errorMessage={htmlSendError}
        sendProgress={htmlSendProgress}
        currentSendEmail={htmlCurrentSendEmail}
        sendInfo={htmlSendInfo}
        confirmTitle="Send HTML campaign?"
        onConfirmSend={() => void handleConfirmHtmlSend()}
        onCancelSend={cancelHtmlSend}
        onClose={closeHtmlSendFlow}
      />
    </div>
  );
}
