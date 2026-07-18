import type { MarketingSendProgressItem, MarketingSendRecipient } from '@/lib/marketing-send-recipients';

/** Send this many emails, then pause before the next batch. */
export const EMAIL_SEND_BATCH_SIZE = 10;
/** Pause between batches (after every 10 sends). */
export const EMAIL_SEND_BATCH_PAUSE_MS = 5_000;
/** Short gap between each individual email so sending feels like a real mail client. */
export const EMAIL_SEND_BETWEEN_MS = 500;

export interface SequentialSendResult {
  sentCount: number;
  failedCount: number;
  failures: string[];
  cancelled: boolean;
}

export interface SequentialSendProgressInfo {
  mode: 'sending' | 'pausing';
  /** Seconds left in the batch pause (only when mode is pausing). */
  pauseSecondsLeft?: number;
  /** 1-based batch number currently being sent or just completed. */
  batchNumber: number;
  /** Total batches for this campaign. */
  totalBatches: number;
  /** How many emails finished in the current batch (0–batch size). */
  sentInBatch: number;
}

export class EmailSendCancelledError extends Error {
  constructor() {
    super('Sending cancelled');
    this.name = 'EmailSendCancelledError';
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new EmailSendCancelledError());
      return;
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new EmailSendCancelledError());
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function assertNotCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new EmailSendCancelledError();
  }
}

export async function runSequentialEmailSend<TPayload>(options: {
  recipients: MarketingSendRecipient[];
  buildPayload: (recipient: MarketingSendRecipient) => TPayload;
  send: (recipient: MarketingSendRecipient, payload: TPayload) => Promise<void>;
  onProgress: (
    items: MarketingSendProgressItem[],
    currentEmail: string | null,
    info: SequentialSendProgressInfo,
  ) => void;
  signal?: AbortSignal;
  batchSize?: number;
  batchPauseMs?: number;
  betweenEmailMs?: number;
}): Promise<SequentialSendResult> {
  const {
    recipients,
    buildPayload,
    send,
    onProgress,
    signal,
    batchSize = EMAIL_SEND_BATCH_SIZE,
    batchPauseMs = EMAIL_SEND_BATCH_PAUSE_MS,
    betweenEmailMs = EMAIL_SEND_BETWEEN_MS,
  } = options;

  const items: MarketingSendProgressItem[] = recipients.map((recipient) => ({
    ...recipient,
    status: 'pending',
  }));

  let sentCount = 0;
  let failedCount = 0;
  const failures: string[] = [];
  const totalBatches = Math.max(1, Math.ceil(recipients.length / batchSize));

  const publish = (
    currentEmail: string | null,
    info: SequentialSendProgressInfo,
  ) => {
    onProgress(
      items.map((item) => ({ ...item })),
      currentEmail,
      info,
    );
  };

  publish(null, {
    mode: 'sending',
    batchNumber: 1,
    totalBatches,
    sentInBatch: 0,
  });

  try {
    for (let index = 0; index < recipients.length; index += 1) {
      assertNotCancelled(signal);

      const batchNumber = Math.floor(index / batchSize) + 1;
      const indexInBatch = index % batchSize;

      // After every full batch of 10, pause before starting the next batch.
      if (index > 0 && indexInBatch === 0 && batchPauseMs > 0) {
        let remaining = batchPauseMs;
        while (remaining > 0) {
          assertNotCancelled(signal);
          const pauseSecondsLeft = Math.ceil(remaining / 1000);
          publish(null, {
            mode: 'pausing',
            pauseSecondsLeft,
            batchNumber,
            totalBatches,
            sentInBatch: 0,
          });
          const step = Math.min(1000, remaining);
          await sleep(step, signal);
          remaining -= step;
        }
      }

      assertNotCancelled(signal);

      const recipient = recipients[index];
      items[index] = { ...items[index], status: 'sending', error: undefined };
      publish(recipient.email, {
        mode: 'sending',
        batchNumber,
        totalBatches,
        sentInBatch: indexInBatch,
      });

      try {
        const payload = buildPayload(recipient);
        await send(recipient, payload);
        assertNotCancelled(signal);
        items[index] = { ...items[index], status: 'sent' };
        sentCount += 1;
      } catch (error) {
        if (error instanceof EmailSendCancelledError) throw error;
        const message = error instanceof Error ? error.message : 'Send failed';
        items[index] = { ...items[index], status: 'failed', error: message };
        failedCount += 1;
        failures.push(`${recipient.email}: ${message}`);
      }

      publish(null, {
        mode: 'sending',
        batchNumber,
        totalBatches,
        sentInBatch: indexInBatch + 1,
      });

      // Small gap between emails (skip after the very last recipient).
      if (index < recipients.length - 1 && betweenEmailMs > 0 && indexInBatch + 1 < batchSize) {
        await sleep(betweenEmailMs, signal);
      }
    }

    return { sentCount, failedCount, failures, cancelled: false };
  } catch (error) {
    if (error instanceof EmailSendCancelledError || signal?.aborted) {
      // Reset any in-flight row back to pending if cancel hit mid-request.
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].status === 'sending') {
          items[i] = { ...items[i], status: 'pending', error: undefined };
        }
      }
      publish(null, {
        mode: 'sending',
        batchNumber: Math.max(1, Math.ceil((sentCount + failedCount) / batchSize)),
        totalBatches,
        sentInBatch: (sentCount + failedCount) % batchSize,
      });
      return { sentCount, failedCount, failures, cancelled: true };
    }
    throw error;
  }
}
