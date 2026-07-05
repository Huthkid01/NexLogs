import { useEffect, useMemo, useState } from 'react';

export function useWalkthroughPlayback<T extends { duration: number }>(
  phases: readonly T[],
  active: boolean,
) {
  const totalMs = useMemo(
    () => phases.reduce((sum, phase) => sum + phase.duration, 0),
    [phases],
  );
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(totalMs / 1000));
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    if (!active || phases.length === 0) return;

    let currentIndex = 0;
    let cycleStart = Date.now();
    let phaseTimeout = 0;

    const scheduleNextPhase = () => {
      const phase = phases[currentIndex];
      phaseTimeout = window.setTimeout(() => {
        currentIndex = (currentIndex + 1) % phases.length;
        if (currentIndex === 0) {
          cycleStart = Date.now();
          setCycleKey((key) => key + 1);
        }
        setPhaseIndex(currentIndex);
        scheduleNextPhase();
      }, phase.duration);
    };

    setPhaseIndex(0);
    setSecondsLeft(Math.ceil(totalMs / 1000));
    scheduleNextPhase();

    const countdownInterval = window.setInterval(() => {
      const elapsed = Date.now() - cycleStart;
      setSecondsLeft(Math.max(1, Math.ceil((totalMs - (elapsed % totalMs)) / 1000)));
    }, 1000);

    return () => {
      window.clearTimeout(phaseTimeout);
      window.clearInterval(countdownInterval);
    };
  }, [active, phases, totalMs]);

  const phase = phases[phaseIndex] ?? phases[0];

  return {
    phase,
    phaseIndex,
    secondsLeft,
    cycleKey,
    totalMs,
    isPlaying: active,
  };
}
