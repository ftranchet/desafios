import { describe, expect, it } from 'vitest';
import { streakFromDates } from './storage';

// Prueba pura de la racha (sin localStorage). Se fija un "ahora" conocido para
// que las fechas relativas sean determinísticas. Todo en UTC, igual que la app.
const NOW = Date.parse('2026-07-02T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function keyDaysAgo(days: number): string {
  return new Date(NOW - days * DAY).toISOString().slice(0, 10);
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
});
