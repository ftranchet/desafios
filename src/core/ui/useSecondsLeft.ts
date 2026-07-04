import { useEffect, useState } from 'react';

const TICK_MS = 200;

// Segundos restantes en número (ADR-005, patrón PRD 10.7.11): el respaldo de
// la barra animada cuando "reducir animaciones" la congela (RNF-06). Reinicia
// su reloj cada vez que cambia `resetKey`; devuelve el total cuando no corre.
export function useSecondsLeft(
  totalSeconds: number,
  running: boolean,
  resetKey: number | string,
): number {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    if (!running) return;
    const startedAt = performance.now();
    const id = window.setInterval(() => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      setSecondsLeft(Math.max(0, Math.ceil(totalSeconds - elapsedSeconds)));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [totalSeconds, running, resetKey]);

  return secondsLeft;
}
