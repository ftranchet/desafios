// Servicio de aleatoriedad con semilla — toda aleatoriedad del proyecto pasa por acá
// (PRD sección 4.2, principio 4) para que las partidas sean reproducibles en tests.

export type Rng = () => number;

// mulberry32: PRNG determinístico, rápido y suficiente para juegos casuales.
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randomFloat(rng: Rng, min: number, max: number): number {
  return rng() * (max - min) + min;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[randomInt(rng, 0, items.length - 1)];
  if (item === undefined) {
    throw new Error('pick: no se puede elegir de una lista vacía');
  }
  return item;
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}
