import type { MarketingSendProgressItem, MarketingSendRecipient } from '@/lib/marketing-send-recipients';

export interface SequentialSendResult {
  sentCount: number;
  failedCount: number;
  failures: string[];
}

export async function runSequentialEmailSend<TPayload>(options: {
  recipients: MarketingSendRecipient[];
  buildPayload: (recipient: MarketingSendRecipient) => TPayload;
  send: (recipient: MarketingSendRecipient, payload: TPayload) => Promise<void>;
  onProgress: (items: MarketingSendProgressItem[], currentEmail: string | null) => void;
}): Promise<SequentialSendResult> {
  const { recipients, buildPayload, send, onProgress } = options;

  const items: MarketingSendProgressItem[] = recipients.map((recipient) => ({
    ...recipient,
    status: 'pending',
  }));

  let sentCount = 0;
  let failedCount = 0;
  const failures: string[] = [];

  const publish = (currentEmail: string | null) => {
    onProgress(items.map((item) => ({ ...item })), currentEmail);
  };

  publish(null);

  for (let index = 0; index < recipients.length; index += 1) {
    const recipient = recipients[index];
    items[index] = { ...items[index], status: 'sending', error: undefined };
    publish(recipient.email);

    try {
      const payload = buildPayload(recipient);
      await send(recipient, payload);
      items[index] = { ...items[index], status: 'sent' };
      sentCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Send failed';
      items[index] = { ...items[index], status: 'failed', error: message };
      failedCount += 1;
      failures.push(`${recipient.email}: ${message}`);
    }

    publish(null);
  }

  return { sentCount, failedCount, failures };
}
