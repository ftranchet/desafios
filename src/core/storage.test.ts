import { describe, expect, it } from 'vitest';
import { streakFromDates } from './storage';

// Prueba pura de la racha (sin localStorage). Se usa mediodía local para que
// las fechas sigan el calendario del usuario aun alrededor de cambios DST.
const NOW = new Date(2026, 6, 2, 12).getTime();

function keyDaysAgo(days: number): string {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('streakFromDates', () => {
  it('devuelve 0 sin partidas', () => {
    expect(streakFromDates(new Set(), NOW)).toBe(0);
  });

  it('cuenta desde hoy cuando se jugó hoy', () => {
    const dates = new Set([keyDaysAgo(0), keyDaysAgo(1), keyDaysAgo(2)]);
    expect(streakFromDates(dates, NOW)).toBe(3);
  });

  it('mantiene la racha viva si se jugó ayer pero todavía no hoy', () => {
    const dates = new Set([keyDaysAgo(1), keyDaysAgo(2)]);
    expect(streakFromDates(dates, NOW)).toBe(2);
  });

  it('se corta al saltear un día completo', () => {
    // Jugó hoy, pero el hueco de ayer corta la racha en 1.
    const dates = new Set([keyDaysAgo(0), keyDaysAgo(2), keyDaysAgo(3)]);
    expect(streakFromDates(dates, NOW)).toBe(1);
  });

  it('devuelve 0 si el último día jugado fue anteayer (racha perdida)', () => {
    const dates = new Set([keyDaysAgo(2), keyDaysAgo(3)]);
    expect(streakFromDates(dates, NOW)).toBe(0);
  });

  it('rechaza un instante actual inválido', () => {
    expect(streakFromDates(new Set([keyDaysAgo(0)]), Number.NaN)).toBe(0);
  });
});
