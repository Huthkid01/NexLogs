const GREETING = 'Thanks for calling Nexlogs, connecting you now.';

/** Browser TTS greeting — free, no external audio file required. */
export function playLiveSupportGreeting() {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(GREETING);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore TTS failures (unsupported browsers / autoplay policies).
  }
}

export function stopLiveSupportGreeting() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // ignore
  }
}
