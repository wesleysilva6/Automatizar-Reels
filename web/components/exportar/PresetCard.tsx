'use client';

import type { Preset } from '@/lib/exportar/presets';

interface PresetCardProps {
  preset: Preset;
  ativo: boolean;
  aoSelecionar: (id: string) => void;
}

export default function PresetCard({ preset, ativo, aoSelecionar }: PresetCardProps) {
  return (
    <button
      className={`preset-card${ativo ? ' ativo' : ''}`}
      onClick={() => aoSelecionar(preset.id)}
      aria-pressed={ativo}
    >
      <div className="preset-topo">
        <span className="preset-icone">{preset.icone}</span>
        <span className="preset-nome">{preset.nome}</span>
        {ativo && <span className="preset-check">✓</span>}
      </div>
      <p className="preset-desc">{preset.descricao}</p>
      <div className="preset-specs">
        <span>{preset.largura}×{preset.altura}</span>
        <span>{preset.fps} fps</span>
        <span>{(preset.vbitrate / 1000).toFixed(preset.vbitrate % 1000 ? 1 : 0)} Mbps</span>
        <span>{preset.codec}</span>
        <span>AAC {preset.abitrate}k</span>
        <span>{preset.formato}</span>
      </div>
    </button>
  );
}
