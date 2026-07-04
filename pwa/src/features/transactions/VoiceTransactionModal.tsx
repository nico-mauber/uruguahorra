import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Button, Spinner, Input } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { useBudgetsStore, isVigente } from '@/store/useBudgetsStore';
import { useUIStore } from '@/store/useUIStore';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';
import { money } from './txHelpers';
import { transcribeAudio, type VoiceResult } from './voiceService';

/**
 * Transacción por voz (IA). Fuente: features/transactions §CU-5, ui-ux §VoiceTransactionModal.
 * MediaRecorder → Edge Function ai-transcribe → confirmación con umbrales de confianza.
 */
type Phase = 'idle' | 'recording' | 'processing' | 'result' | 'error';
const MAX_SECONDS = 30;

interface Props {
  onClose: () => void;
  onDone: () => void;
}

export function VoiceTransactionModal({ onClose, onDone }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isOnline = useUIStore((s) => s.isOnline);
  const categories = useTransactionsStore((s) => s.categories);
  const fetchCategories = useTransactionsStore((s) => s.fetchCategories);
  const createQuick = useTransactionsStore((s) => s.createQuick);
  const fetchActiveBudgets = useBudgetsStore((s) => s.fetchActive);
  const activeBudgets = useBudgetsStore((s) => s.active);

  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    void fetchCategories();
    if (userId) void fetchActiveBudgets(userId);
    return () => stopTimer();
  }, [fetchCategories, fetchActiveBudgets, userId]);

  // Categoría matcheada por category_hint dentro del tipo elegido (sugerencia
  // por defecto; el usuario puede forzarla eligiendo un presupuesto abajo).
  const matchedCat = useMemo(() => {
    const hint = result?.parsed.category_hint?.toLowerCase() ?? '';
    if (!hint) return null;
    return categories.find((c) => c.type === type && c.name.toLowerCase().includes(hint)) ?? null;
  }, [categories, type, result]);

  // Todos los presupuestos activos+vigentes (sólo aplica a gastos): se muestran
  // siempre, sin importar la categoría matcheada, porque el auto-match puede
  // errarle a la categoría real que el usuario quiso decir.
  const vigentBudgets = useMemo(
    () => (type === 'expense' ? activeBudgets.filter(isVigente) : []),
    [activeBudgets, type]
  );
  const selectedBudget = vigentBudgets.find((b) => b.id === selectedBudgetId) ?? null;

  // Elegir un presupuesto fuerza la categoría de la transacción a la de ese presupuesto
  // (resuelto en confirm() vía selectedBudget.categoryId). Tocar de nuevo deselecciona.
  function selectBudget(budgetId: string) {
    setSelectedBudgetId((prev) => (prev === budgetId ? null : budgetId));
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function startRecording() {
    if (!isOnline) {
      setErrorMsg('La transacción por voz requiere conexión.');
      setPhase('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void process(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      rec.start();
      recorderRef.current = rec;
      setSeconds(0);
      setPhase('recording');
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setErrorMsg('Sin acceso al micrófono. Habilítalo en la configuración de tu navegador.');
      setPhase('error');
    }
  }

  function stopRecording() {
    stopTimer();
    recorderRef.current?.stop();
  }

  async function process(blob: Blob) {
    setPhase('processing');
    try {
      const res = await transcribeAudio(blob);
      if (res.confidence < 0.3) {
        setErrorMsg('No entendí el audio, intenta de nuevo.');
        setPhase('error');
        return;
      }
      setResult(res);
      setAmount(res.parsed.amount ? String(res.parsed.amount) : '');
      setDescription(res.parsed.description ?? '');
      setType(res.parsed.type === 'income' ? 'income' : 'expense');
      setSelectedBudgetId(null);
      setPhase('result');
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
      setPhase('error');
    }
  }

  async function confirm() {
    if (!userId || !result) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      ToastService.warning('Monto inválido', 'Ingresa un monto válido mayor a 0');
      return;
    }
    // Un presupuesto elegido fuerza su categoría; si no, se usa la matcheada
    // (o null, y el trigger auto-categoriza).
    setSaving(true);
    try {
      await createQuick(userId, {
        amount: n,
        category_id: selectedBudget?.categoryId ?? matchedCat?.id ?? null,
        description: description.trim() || undefined,
        type,
        budget_id: selectedBudget?.id ?? null,
      });
      ToastService.success('¡Listo! 💚', `Transacción de $${Math.floor(n)} registrada`);
      onDone();
    } catch (error) {
      ToastService.error('No se pudo registrar', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const badge = result && (result.confidence >= 0.8
    ? { color: 'var(--color-success)', text: `Confianza ${Math.round(result.confidence * 100)}%` }
    : { color: 'var(--color-warning)', text: `Confianza ${Math.round(result.confidence * 100)}% — revisá los campos` });

  return (
    <Dialog open onClose={onClose} title="Transacción por voz">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', alignItems: 'center', textAlign: 'center' }}>
        {phase === 'idle' && (
          <>
            <button onClick={() => void startRecording()} aria-label="Grabar"
              style={{ width: 96, height: 96, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--color-primary)', color: '#fff', fontSize: 40 }}>🎙️</button>
            <p style={{ color: 'var(--color-text-secondary)' }}>Toca y di tu transacción, ej: «Gasté 250 pesos en supermercado»</p>
          </>
        )}

        {phase === 'recording' && (
          <>
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, animation: 'pulse 1s infinite' }}>⏺️</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>0:{String(seconds).padStart(2, '0')} / 0:{MAX_SECONDS}</div>
            <Button onClick={stopRecording}>Detener</Button>
          </>
        )}

        {phase === 'processing' && <Spinner label="Transcribiendo…" />}

        {phase === 'result' && result && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', textAlign: 'left' }}>
            <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>«{result.transcript}»</p>
            {badge && <span style={{ alignSelf: 'flex-start', padding: '2px 10px', borderRadius: 999, background: `color-mix(in srgb, ${badge.color} 15%, transparent)`, color: badge.color, fontSize: 12, fontWeight: 600 }}>{badge.text}</span>}
            <div style={{ display: 'flex', gap: 8 }} role="group" aria-label="Tipo de transacción">
              {(['income', 'expense'] as const).map((t) => {
                const selected = type === t;
                const color = t === 'income' ? 'var(--color-success)' : 'var(--color-error)';
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); if (t === 'income') setSelectedBudgetId(null); }}
                    aria-pressed={selected}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md, 10px)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      border: `1px solid ${selected ? color : 'var(--color-border)'}`,
                      background: selected ? `color-mix(in srgb, ${color} 18%, transparent)` : 'transparent',
                      color: selected ? color : 'var(--color-text-secondary)',
                    }}
                  >
                    {t === 'income' ? 'Ingreso' : 'Gasto'}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Categoría: {selectedBudget
                ? `${selectedBudget.categoryEmoji} ${selectedBudget.categoryName}`
                : (result.parsed.category_hint || '—')}
            </div>
            {vigentBudgets.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Vincular a presupuesto
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {vigentBudgets.map((b) => {
                    const selected = b.id === selectedBudgetId;
                    const restante = Math.max(0, b.amount - b.spent);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => selectBudget(b.id)}
                        aria-pressed={selected}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                          borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                          border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: selected ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'var(--color-surface)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <span>{b.categoryEmoji}</span>
                        <span style={{ flex: 1, fontSize: 13 }}>{b.categoryName}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{money(restante)} restante</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <Input type="number" inputMode="numeric" prefix="$" placeholder="Monto" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" onClick={() => setPhase('idle')}>Reintentar</Button>
              <Button style={{ flex: 1 }} loading={saving} onClick={() => void confirm()}>Confirmar</Button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <>
            <p style={{ color: 'var(--color-error)' }}>{errorMsg}</p>
            <Button onClick={() => setPhase('idle')}>Reintentar</Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
