import type { GameMetadata } from '../../core/contract';
import { CATEGORY_ACCENT } from '../categoryColors';

// Chip de ícono de juego (ADR-009): fondo sólido del color de la categoría y
// el glifo del juego en silueta (mask-image) teñido con bg — el rol "sobre
// acento" del sistema, theme-aware sin tocar los icon.svg. Compartido por la
// tarjeta del catálogo, la portada del juego y el header de partida.
//
// url() con comillas dobles a propósito: Vite inyecta el SVG como data-URI
// con comillas simples adentro — sin envolverlo, el valor CSS es inválido y
// la máscara se descarta en silencio.

type ChipSize = 'sm' | 'md' | 'lg';

const CHIP_CLASSES: Record<ChipSize, { box: string; glyph: string }> = {
  sm: { box: 'h-8 w-8 rounded-lg', glyph: 'h-5 w-5' },
  md: { box: 'h-12 w-12 rounded-lg', glyph: 'h-7 w-7' },
  lg: { box: 'h-16 w-16 rounded-xl', glyph: 'h-10 w-10' },
};

export function GameIconChip({
  metadata,
  size = 'md',
}: {
  metadata: GameMetadata;
  size?: ChipSize;
}) {
  const accent = CATEGORY_ACCENT[metadata.category];
  const chip = CHIP_CLASSES[size];
  return (
    <div className={`flex shrink-0 items-center justify-center ${chip.box} ${accent.activeBg}`}>
      <span
        aria-hidden="true"
        className={`icon-mask bg-bg ${chip.glyph}`}
        style={{
          maskImage: `url("${metadata.icon}")`,
          WebkitMaskImage: `url("${metadata.icon}")`,
        }}
      />
    </div>
  );
}
