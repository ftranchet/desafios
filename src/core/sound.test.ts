// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalAudioContext = Object.getOwnPropertyDescriptor(window, 'AudioContext');

function installAudioContext(value: unknown): void {
  Object.defineProperty(window, 'AudioContext', { configurable: true, value });
}

async function importFreshSound() {
  vi.resetModules();
  return import('./sound');
}

afterEach(() => {
  if (originalAudioContext) {
    Object.defineProperty(window, 'AudioContext', originalAudioContext);
  } else {
    Reflect.deleteProperty(window, 'AudioContext');
  }
  vi.restoreAllMocks();
});

describe('audio best-effort', () => {
  it('se degrada a silencio cuando Web Audio no existe', async () => {
    Reflect.deleteProperty(window, 'AudioContext');
    Reflect.deleteProperty(window, 'webkitAudioContext');
    const { playSound, playTone, warmUpAudio } = await importFreshSound();

    expect(() => warmUpAudio()).not.toThrow();
    expect(() => playSound('success')).not.toThrow();
    expect(() => playTone(440, 100)).not.toThrow();
  });

  it('no propaga una excepción al crear el contexto', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installAudioContext(
      class BrokenAudioContext {
        constructor() {
          throw new DOMException('Audio blocked');
        }
      },
    );
    const { playSound, warmUpAudio } = await importFreshSound();

    expect(() => warmUpAudio()).not.toThrow();
    expect(() => playSound('record')).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('no propaga fallas al crear nodos y valida tonos inválidos', async () => {
    const constructorCall = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installAudioContext(
      class PartialAudioContext {
        state = 'running';
        currentTime = 0;
        destination = {};

        constructor() {
          constructorCall();
        }

        createOscillator() {
          throw new DOMException('Node blocked');
        }

        createGain() {
          throw new DOMException('Node blocked');
        }
      },
    );
    const { playSound, playTone } = await importFreshSound();

    expect(() => playTone(Number.NaN, 100)).not.toThrow();
    expect(constructorCall).not.toHaveBeenCalled();
    expect(() => playTone(440, 100)).not.toThrow();
    expect(() => playSound('success')).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
