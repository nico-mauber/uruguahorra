import { useEffect, useState } from 'react';
import { Icon } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { useUIStore } from '@/store/useUIStore';
import { money } from './txHelpers';
import { QuickTransactionModal } from './QuickTransactionModal';
import { VoiceTransactionModal } from './VoiceTransactionModal';

/**
 * FAB expandible de transacciones. Fuente: docs/features/transactions §CU-3, ui-ux §TransactionFAB.
 * Voz: Edge Function `ai-transcribe` (requiere deploy con OPENAI_API_KEY); deshabilitada offline.
 */
interface Props {
  onCreated?: () => void;
}

type ModalState = { type: 'expense' | 'income'; preset?: { description?: string; categoryId?: string | null } } | null;

export function TransactionFAB({ onCreated }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isOnline = useUIStore((s) => s.isOnline);
  const frequent = useTransactionsStore((s) => s.frequent);
  const fetchFrequent = useTransactionsStore((s) => s.fetchFrequent);

  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    if (open && userId) void fetchFrequent(userId);
  }, [open, userId, fetchFrequent]);

  function launch(
    type: 'expense' | 'income',
    preset?: { description?: string; categoryId?: string | null }
  ) {
    setModal({ type, preset });
    setOpen(false);
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 'var(--z-overlay)' }}
        />
      )}

      {/* Acciones expandidas */}
      {open && (
        <div style={{
          position: 'fixed', right: 20, bottom: 'calc(var(--touch-fab) + 40px)',
          zIndex: 'calc(var(--z-overlay) + 1)', display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', gap: 12,
        }}>
          {/* Frecuentes (hasta 3) */}
          {frequent.slice(0, 3).map((f, i) => (
            <button
              key={`${f.description}-${i}`}
              onClick={() => launch('expense', { description: f.description, categoryId: f.categoryId })}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999,
                border: 'none', cursor: 'pointer', background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)',
                color: 'var(--color-text-primary)', fontSize: 14,
              }}
            >
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.description || 'Sin descripción'}
              </span>
              <strong>{money(f.avgAmount)}</strong>
            </button>
          ))}

          <Pill color="var(--color-expense)" label="Gasto" icon="warning" onClick={() => launch('expense')} />
          <Pill color="var(--color-savings)" label="Ingreso" icon="add" onClick={() => launch('income')} />
          <Pill color="var(--color-primary)" label={isOnline ? 'Voz' : 'Voz (sin conexión)'} icon="person"
            disabled={!isOnline}
            onClick={() => { setVoiceOpen(true); setOpen(false); }} />
        </div>
      )}

      {/* Botón principal */}
      <button
        aria-label={open ? 'Cerrar acciones' : 'Nueva transacción'}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed', right: 20, bottom: 24, width: 64, height: 64, borderRadius: '50%',
          background: 'var(--color-primary)', border: '3px solid var(--color-primary-light)',
          cursor: 'pointer', zIndex: 'calc(var(--z-overlay) + 2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: open ? 'rotate(135deg)' : 'none', transition: 'transform 200ms', boxShadow: 'var(--shadow-lg)',
        }}
      >
        <Icon name="add" size={32} color="#fff" />
      </button>

      {modal && (
        <QuickTransactionModal
          type={modal.type}
          preset={modal.preset}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); onCreated?.(); }}
        />
      )}

      {voiceOpen && (
        <VoiceTransactionModal
          onClose={() => setVoiceOpen(false)}
          onDone={() => { setVoiceOpen(false); onCreated?.(); }}
        />
      )}
    </>
  );
}

function Pill({ color, label, icon, onClick, disabled }: {
  color: string; label: string; icon: 'warning' | 'add' | 'person'; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Requiere conexión — próximamente' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', background: color, color: '#fff',
        fontSize: 15, fontWeight: 600, opacity: disabled ? 0.6 : 1, boxShadow: 'var(--shadow-md)',
      }}
    >
      <Icon name={icon} size={18} color="#fff" />
      {label}
    </button>
  );
}
