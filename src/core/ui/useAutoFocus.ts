import { useEffect, useRef, type RefObject } from 'react';

// Auto-foco del área de juego al montar (ADR-005, patrón PRD 10.7.8): las
// flechas, dígitos y atajos funcionan desde el primer segundo en escritorio,
// sin exigir un clic previo sobre el tablero (RNF-11).
export function useAutoFocus<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}
