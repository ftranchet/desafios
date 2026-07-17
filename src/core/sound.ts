import type { GameSoundEffect } from './contract';

// Efectos de sonido chiptune generados por síntesis (osciladores + envolvente),
// sin assets externos — regla 11.2 del PRD: el sonido siempre es original y
// vive todo en este archivo. Se activan solo si la configuración de sonido
// está encendida (RF-08); para los juegos, el shell inyecta la capacidad ya
// gateada vía GameProps.audio (ADR-006).

export type SoundEffect = GameSoundEffect;

let audioContext: AudioContext | null = null;
let audioUnavailable = false;

type AudioContextConstructor = new () => AudioContext;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  if (audioUnavailable || typeof window === 'undefined') return null;

  const audioWindow = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextClass) {
    audioUnavailable = true;
    return null;
  }

  try {
    audioContext = new AudioContextClass();
    return audioContext;
  } catch (error) {
    audioUnavailable = true;
    console.warn('Web Audio no está disponible; se continúa sin sonido:', error);
    return null;
  }
}

function resumeBestEffort(ctx: AudioContext): void {
  if (ctx.state !== 'suspended') return;
  try {
    void ctx.resume().catch(() => undefined);
  } catch {
    // El sonido es opcional: nunca interrumpe una acción del juego.
  }
}

// Desbloquea el audio dentro de un gesto directo del usuario (ej: el tap de
// "Jugar"). En iOS/Safari, resume() solo surte efecto en el call stack de una
// interacción; los efectos se disparan después desde timers/tick, donde ya no
// hay gesto — por eso hay que "despertar" el contexto acá primero (RF-08).
export function warmUpAudio(): void {
  const ctx = getAudioContext();
  if (ctx) resumeBestEffort(ctx);
}

interface Tone {
  frequency: number;
  startOffset: number;
  durationMs: number;
  type: OscillatorType;
}

const EFFECTS: Record<SoundEffect, Tone[]> = {
  success: [{ frequency: 880, startOffset: 0, durationMs: 90, type: 'square' }],
  error: [{ frequency: 160, startOffset: 0, durationMs: 160, type: 'sawtooth' }],
  record: [
    { frequency: 660, startOffset: 0, durationMs: 80, type: 'square' },
    { frequency: 880, startOffset: 80, durationMs: 80, type: 'square' },
    { frequency: 1320, startOffset: 160, durationMs: 140, type: 'square' },
  ],
  gameover: [
    { frequency: 440, startOffset: 0, durationMs: 100, type: 'triangle' },
    { frequency: 330, startOffset: 100, durationMs: 100, type: 'triangle' },
    { frequency: 220, startOffset: 200, durationMs: 200, type: 'triangle' },
  ],
};

// Un tono puntual con la misma envolvente que los efectos: lo usan los juegos
// vía GameProps.audio.tone (ADR-006) — p. ej. la voz de cada pad de Simon.
export function playTone(frequency: number, durationMs: number): void {
  if (
    !Number.isFinite(frequency) ||
    frequency <= 0 ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    resumeBestEffort(ctx);
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;

    const duration = durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + Math.min(0.02, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  } catch (error) {
    console.warn('No se pudo reproducir el tono:', error);
  }
}

export function playSound(effect: SoundEffect): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  // En móvil el contexto puede arrancar suspendido hasta un gesto del usuario;
  // reanudarlo asegura que el primer efecto suene.
  try {
    resumeBestEffort(ctx);
    const now = ctx.currentTime;

    for (const tone of EFFECTS[effect]) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = tone.type;
      oscillator.frequency.value = tone.frequency;

      const start = now + tone.startOffset / 1000;
      const duration = tone.durationMs / 1000;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + Math.min(0.02, duration / 4));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    }
  } catch (error) {
    console.warn('No se pudo reproducir el efecto de sonido:', error);
  }
}
