import { describe, expect, it } from 'vitest';
import { buildModes, isModeId } from './modes';

describe('buildModes', () => {
  it('declara las tres dificultades obligatorias por defecto', () => {
    expect(buildModes().map((mode) => mode.id)).toEqual(['easy', 'medium', 'hard']);
  });

  it('agrega únicamente los modos especiales habilitados y en orden canónico', () => {
    expect(buildModes({ progressive: true }).map((mode) => mode.id)).toEqual([
      'easy',
      'medium',
      'hard',
      'progressive',
    ]);
    expect(buildModes({ zen: true, progressive: true }).map((mode) => mode.id)).toEqual([
      'easy',
      'medium',
      'hard',
      'zen',
      'progressive',
    ]);
  });
});

describe('isModeId', () => {
  it.each(['easy', 'medium', 'hard', 'zen', 'progressive'])('acepta el modo %s', (mode) => {
    expect(isModeId(mode)).toBe(true);
  });

  it.each(['', 'unknown', 'toString', 'constructor', '__proto__'])(
    'rechaza la clave ajena o heredada %s',
    (value) => {
      expect(isModeId(value)).toBe(false);
    },
  );

  it.each([null, undefined, 1, {}, []])('rechaza valores no string', (value) => {
    expect(isModeId(value)).toBe(false);
  });
});
