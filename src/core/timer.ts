// Utilidad de temporizadores para juegos en tiempo real (PRD sección 5.1, CORE).
// Envuelve setTimeout/setInterval con una API que se puede pausar y cancelar,
// pensada para el bucle de juego de Snake/Cascada y para cuentas regresivas.

export interface Countdown {
  cancel(): void;
  pause(): void;
  resume(): void;
}

export function createCountdown(durationMs: number, onComplete: () => void): Countdown {
  let remainingMs = durationMs;
  let startedAt = performance.now();
  let handle: ReturnType<typeof setTimeout> | null = null;
  let paused = false;

  function schedule() {
    startedAt = performance.now();
    handle = setTimeout(() => {
      handle = null;
      onComplete();
    }, remainingMs);
  }

  schedule();

  return {
    cancel() {
      if (handle !== null) clearTimeout(handle);
      handle = null;
    },
    pause() {
      if (paused || handle === null) return;
      paused = true;
      clearTimeout(handle);
      handle = null;
      remainingMs -= performance.now() - startedAt;
    },
    resume() {
      if (!paused) return;
      paused = false;
      schedule();
    },
  };
}

export interface Interval {
  cancel(): void;
}

export function createInterval(intervalMs: number, onTick: () => void): Interval {
  const handle = setInterval(onTick, intervalMs);
  return {
    cancel() {
      clearInterval(handle);
    },
  };
}
