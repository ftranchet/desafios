// Wrapper mínimo sobre la Vibration API, gateado por la preferencia de vibración (RF-08).

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
