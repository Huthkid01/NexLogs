import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import type { DailyCall } from '@daily-co/daily-js';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';
import { useModalLock } from '@/hooks/useModalLock';
import { useSiteContent } from '@/hooks/useSiteContent';
import { playLiveSupportGreeting, stopLiveSupportGreeting } from '@/lib/live-support-greeting';
import { getTelegramSupportUrl } from '@/lib/telegram-url';
import { startLiveSupportCall } from '@/services/live-support-call.service';

type CallPhase =
  | 'precall'
  | 'calling'
  | 'waiting'
  | 'connected'
  | 'unavailable'
  | 'error';

interface LiveSupportCallModalProps {
  open: boolean;
  onClose: () => void;
}

const AGENT_WAIT_MS = 55_000;

function hasRemoteParticipant(call: DailyCall) {
  return Object.values(call.participants()).some((participant) => !participant.local);
}

export function LiveSupportCallModal({ open, onClose }: LiveSupportCallModalProps) {
  useModalLock(open, onClose);
  const { content } = useSiteContent();
  const telegramUrl = getTelegramSupportUrl(content);

  const [phase, setPhase] = useState<CallPhase>('precall');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const callRef = useRef<DailyCall | null>(null);
  const waitTimerRef = useRef<number | null>(null);
  const startingRef = useRef(false);

  const clearWaitTimer = () => {
    if (waitTimerRef.current != null) {
      window.clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  };

  const destroyCall = async () => {
    clearWaitTimer();
    stopLiveSupportGreeting();
    const call = callRef.current;
    callRef.current = null;
    if (!call) return;
    try {
      await call.leave();
    } catch {
      // ignore
    }
    try {
      await call.destroy();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!open) {
      void destroyCall();
      return;
    }
    setPhase('precall');
    setErrorMessage(null);
    startingRef.current = false;
  }, [open]);

  const markConnected = () => {
    clearWaitTimer();
    stopLiveSupportGreeting();
    setPhase('connected');
  };

  const markUnavailable = async () => {
    await destroyCall();
    setPhase('unavailable');
  };

  const startCall = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setErrorMessage(null);
    setPhase('calling');

    try {
      playLiveSupportGreeting();

      const session = await startLiveSupportCall();
      const Daily = (await import('@daily-co/daily-js')).default;
      const call = Daily.createCallObject({
        audioSource: true,
        videoSource: false,
      });
      callRef.current = call;

      call.on('participant-joined', (event) => {
        if (event?.participant && !event.participant.local) {
          markConnected();
        }
      });

      call.on('participant-updated', () => {
        if (callRef.current && hasRemoteParticipant(callRef.current)) {
          markConnected();
        }
      });

      call.on('joined-meeting', () => {
        if (callRef.current && hasRemoteParticipant(callRef.current)) {
          markConnected();
          return;
        }
        setPhase('waiting');
        clearWaitTimer();
        waitTimerRef.current = window.setTimeout(() => {
          void markUnavailable();
        }, AGENT_WAIT_MS);
      });

      call.on('error', (event) => {
        setErrorMessage(event?.errorMsg || 'Call connection failed');
        setPhase('error');
      });

      await call.join({
        url: session.roomUrl,
        startVideoOff: true,
        startAudioOff: false,
      });
    } catch (error) {
      stopLiveSupportGreeting();
      await destroyCall();
      setErrorMessage(error instanceof Error ? error.message : 'Could not start live support call');
      setPhase('error');
    } finally {
      startingRef.current = false;
    }
  };

  const endAndClose = async () => {
    await destroyCall();
    setPhase('precall');
    setErrorMessage(null);
    onClose();
  };

  const resetToPrecall = async () => {
    await destroyCall();
    setErrorMessage(null);
    setPhase('precall');
  };

  if (!open) return null;

  const statusText =
    phase === 'precall'
      ? 'Support line'
      : phase === 'calling'
        ? 'Calling Nexlogs support…'
        : phase === 'waiting'
          ? 'Waiting for an agent…'
          : phase === 'connected'
            ? 'Connected'
            : phase === 'unavailable'
              ? 'Agent unavailable right now'
              : 'Call failed';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={() => void endAndClose()}
        aria-label="Close call support"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-support-call-title"
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-[#0f172a] text-white shadow-2xl"
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-8">
          <NexLogsLogo className="h-8 brightness-0 invert" />

          <p
            id="live-support-call-title"
            className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-white/70"
          >
            {statusText}
          </p>

          {(phase === 'calling' || phase === 'waiting') && (
            <div className="relative mt-10 flex h-28 w-28 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
              <span className="absolute inset-3 animate-pulse rounded-full bg-emerald-400/20" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
                <Phone className="h-8 w-8 text-white" />
              </span>
            </div>
          )}

          {phase === 'connected' && (
            <div className="mt-10 flex h-28 w-28 items-center justify-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
                <Phone className="h-8 w-8 text-white" />
              </span>
            </div>
          )}

          {phase === 'precall' && (
            <>
              <button
                type="button"
                onClick={() => void startCall()}
                aria-label="Start call"
                className="mt-10 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/40 transition-transform hover:scale-105 active:scale-95"
              >
                <Phone className="h-10 w-10 text-white" />
              </button>
              <p className="mt-5 text-center text-sm text-white/65">An agent will join shortly</p>
            </>
          )}

          {phase === 'calling' && (
            <p className="mt-6 text-center text-sm text-white/65">
              Thanks for calling Nexlogs, connecting you now.
            </p>
          )}

          {phase === 'waiting' && (
            <p className="mt-6 text-center text-sm text-white/65">
              Stay on the line — support has been notified.
            </p>
          )}

          {phase === 'connected' && (
            <p className="mt-6 text-center text-sm text-emerald-300">You are live with support.</p>
          )}

          {phase === 'unavailable' && (
            <div className="mt-8 w-full space-y-3">
              <p className="text-center text-sm text-white/70">
                No agent picked up in time. Chat with us on Telegram instead.
              </p>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center rounded-xl bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white"
              >
                Chat on Telegram instead
              </a>
              <button
                type="button"
                onClick={() => void resetToPrecall()}
                className="w-full text-sm font-medium text-white/60 hover:text-white"
              >
                Try calling again
              </button>
            </div>
          )}

          {phase === 'error' && (
            <div className="mt-8 w-full space-y-3">
              <p className="text-center text-sm text-red-300">
                {errorMessage || 'Live call is unavailable right now.'}
              </p>
              <button
                type="button"
                onClick={() => void resetToPrecall()}
                className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"
              >
                Try again
              </button>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white"
              >
                Chat on Telegram instead
              </a>
            </div>
          )}
        </div>

        {(phase === 'calling' || phase === 'waiting' || phase === 'connected') && (
          <div className="border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={() => void endAndClose()}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-105"
              aria-label="End call"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <p className="mt-2 text-center text-xs text-white/50">End call</p>
          </div>
        )}

        {(phase === 'precall' || phase === 'unavailable' || phase === 'error') && (
          <div className="border-t border-white/10 px-6 py-3">
            <button
              type="button"
              onClick={() => void endAndClose()}
              className="w-full text-sm font-medium text-white/55 hover:text-white"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
