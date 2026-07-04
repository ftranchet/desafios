// Barra de tiempo compartida (ADR-005, patrón PRD 10.7.11): se anima de 100%
// a 0% con la animación global `shrink-width`; `resetKey` la reinicia en cada
// pregunta/ronda. Con "reducir animaciones" queda congelada — por eso siempre
// se acompaña con `useSecondsLeft` como respaldo numérico (RNF-06).

interface CountdownBarProps {
  durationMs: number;
  running: boolean;
  resetKey: number | string;
}

export function CountdownBar({ durationMs, running, resetKey }: CountdownBarProps) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
      {running && (
        <div
          key={resetKey}
          className="h-full rounded-full bg-accent-primary"
          style={{ animation: `shrink-width ${durationMs}ms linear forwards` }}
        />
      )}
    </div>
  );
}
