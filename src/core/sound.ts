// Efectos de sonido chiptune generados por síntesis (osciladores + envolvente),
// sin assets externos — regla 11.2 del PRD: el sonido siempre es original.
// Se activan solo si la configuración de sonido está encendida (RF-08).

export type SoundEffect = 'success' | 'error' | 'record' | 'gameover';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
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

export function playSound(effect: SoundEffect): void {
  const ctx = getAudioContext();
  // En móvil el contexto puede arrancar suspendido hasta un gesto del usuario;
  // reanudarlo asegura que el primer efecto suene.
  if (ctx.state === 'suspended') void ctx.resume();
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
}
