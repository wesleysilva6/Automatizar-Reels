'use client';

import { useExport } from '@/contexts/ExportContext';

const ICONE = { sucesso: '✅', erro: '⚠️', info: 'ℹ️' } as const;

export default function Toasts() {
  const { toasts, descartarToast } = useExport();
  if (toasts.length === 0) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tipo}`} onClick={() => descartarToast(t.id)}>
          <span className="toast-icone">{ICONE[t.tipo]}</span>
          <span className="toast-msg">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
