import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, ProgressBar, Icon, Spinner, Fab } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useGoalsStore, type Goal } from '@/store/useGoalsStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { LevelsService } from '@/services/LevelsService';
import { ToastService } from '@/lib/toast';
import {
  goalProgress, colorForProgress, money,
} from '@/features/goals/goalHelpers';
import { useApplySaving } from '@/features/goals/useApplySaving';
import { GoalDetailModal } from '@/features/goals/GoalDetailModal';
import { PodsList } from '@/features/pods/PodsList';
import { GoalSelectionModal } from './GoalSelectionModal';

/**
 * Pantalla `/` (Dashboard). Fuente: docs/features/dashboard/{functional-specs,ui-ux}.
 */
export function DashboardScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const displayName = user?.email?.split('@')[0] ?? '';

  const goals = useGoalsStore((s) => s.goals);
  const isLoadingGoals = useGoalsStore((s) => s.isLoading);
  const fetchGoals = useGoalsStore((s) => s.fetchGoals);
  const getTotalSaved = useGoalsStore((s) => s.getTotalSaved);

  const stats = useGamificationStore((s) => s.stats);
  const statsError = useGamificationStore((s) => s.error);
  const loadStats = useGamificationStore((s) => s.loadStats);

  const { applySaving, isSaving } = useApplySaving();

  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectGoal, setSelectGoal] = useState<Goal | null>(null);
  const [selectionAmount, setSelectionAmount] = useState<number | null>(null);
  const welcomed = useRef(false);

  // Carga inicial (una vez por sesión de pantalla).
  useEffect(() => {
    if (!userId) return;
    void fetchGoals(userId);
    void loadStats(userId);
  }, [userId, fetchGoals, loadStats]);

  // Toast de bienvenida (una sola vez, a 1.5s).
  useEffect(() => {
    if (welcomed.current || !displayName) return;
    welcomed.current = true;
    const t = setTimeout(() => ToastService.welcome(displayName), 1500);
    return () => clearTimeout(t);
  }, [displayName]);

  const active = goals.filter((g) => g.isActive);
  const totalSaved = getTotalSaved();

  async function handleQuickSave() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      ToastService.warning('Monto inválido', 'Ingresa un monto válido mayor a 0');
      return;
    }
    if (active.length === 0) {
      ToastService.warning('Sin metas', 'Crea una meta primero para poder ahorrar');
      return;
    }
    if (active.length === 1) {
      const res = await applySaving(active[0].id, n);
      if (res.ok) {
        setAmount('');
        setExpanded(false);
      } else if (res.reason === 'exceeds') {
        // Abrir selector con el monto para ajustar.
        setSelectionAmount(n);
      }
      return;
    }
    // >1 meta → selector.
    setSelectionAmount(n);
  }

  if (isLoadingGoals && goals.length === 0 && !stats) {
    return <Spinner fullscreen label="Cargando tu progreso…" />;
  }

  const tierColor = stats ? LevelsService.getTierColor(stats.level) : 'var(--color-primary)';

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', padding: 20, paddingBottom: 'calc(var(--touch-fab) + var(--space-2xl))' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>¡Hola, {displayName}!</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Tu progreso de hoy</p>
      </div>

      {/* Card de gamificación */}
      {stats && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: `color-mix(in srgb, ${tierColor} 20%, transparent)`,
              border: `2px solid ${tierColor}`,
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: tierColor }}>{stats.level}</span>
              <span style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>NIVEL</span>
            </div>
            <div style={{ flex: 1 }}>
              <ProgressBar progress={stats.levelInfo.progress} color={tierColor} showLabel />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <span>{stats.totalXP} XP</span>
                <span>siguiente: {stats.levelInfo.nextLevelXP} XP</span>
              </div>
            </div>
          </div>

          {/* Racha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <span style={{ fontSize: 24, color: 'var(--color-streak)' }}>🔥</span>
            <div>
              <div style={{ fontWeight: 700 }}>{stats.streak.currentStreak} días de racha</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Récord: {stats.streak.longestStreak} · Protección{' '}
                {Math.max(0, 1 - stats.streak.streakProtectionsUsed) > 0 ? '🛡️ disponible' : 'usada'}
              </div>
            </div>
          </div>
        </Card>
      )}
      {statsError && (
        <div style={{ background: 'color-mix(in srgb, var(--color-error) 12%, transparent)', color: 'var(--color-error)', padding: 12, borderRadius: 12, marginBottom: 16, fontSize: 13, textAlign: 'center' }}>
          No se pudo cargar tu progreso de gamificación.
        </div>
      )}

      {/* 3 stat-cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Nivel', value: stats ? String(stats.level) : '—' },
          { label: 'XP Total', value: stats ? String(stats.totalXP) : '—' },
          { label: 'Ahorrado', value: money(totalSaved) },
        ].map((s) => (
          <Card key={s.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Ver Transacciones */}
      <button
        onClick={() => navigate('/transactions')}
        style={{
          width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
          background: 'var(--color-primary)', borderRadius: 16, padding: 16,
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="receipt" size={22} color="#fff" />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', color: '#fff', fontSize: 18, fontWeight: 600 }}>Ver Transacciones</span>
          <span style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Ingresos y gastos detallados</span>
        </span>
        <Icon name="flag" size={18} color="#fff" />
      </button>

      {/* Ahorro rápido (solo si hay metas) */}
      {active.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ahorro rápido para tus metas</h2>
          {!expanded ? (
            <Button size="large" style={{ width: '100%', minHeight: 56 }} onClick={() => setExpanded(true)}>
              💵 Ingresa tu monto
            </Button>
          ) : (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong>Monto personalizado</strong>
                <button onClick={() => { setExpanded(false); setAmount(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-secondary)' }}>✕</button>
              </div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 20, fontWeight: 600, color: 'var(--color-text-secondary)' }}>$</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && void handleQuickSave()}
                  placeholder="0"
                  style={{
                    width: '100%', height: 56, borderRadius: 12, textAlign: 'center',
                    fontSize: 20, fontWeight: 600, paddingLeft: 32,
                    border: '2px solid var(--color-primary)', background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button variant="outline" style={{ flex: 1 }} onClick={() => { setExpanded(false); setAmount(''); }}>Cancelar</Button>
                <Button style={{ flex: 1 }} loading={isSaving} disabled={!amount || Number(amount) <= 0} onClick={() => void handleQuickSave()}>
                  Ahorrar
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Mis metas activas */}
      {active.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Mis metas activas</h2>
            <button onClick={() => navigate('/goals')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 14, cursor: 'pointer' }}>Ver todas →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {active.slice(0, 3).map((g) => {
              const progress = goalProgress(g);
              return (
                <Card key={g.id} onClick={() => setSelectGoal(g)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{g.name}</strong>
                    <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{money(g.savedAmount)} / {money(g.targetAmount)}</span>
                  </div>
                  <ProgressBar progress={progress} color={colorForProgress(progress)} showLabel />
                </Card>
              );
            })}
          </div>
          {active.length > 3 && (
            <Button variant="outline" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/goals')}>
              Ver {active.length - 3} metas más
            </Button>
          )}
        </div>
      )}

      {/* Pods */}
      <PodsList />

      <Fab icon="add" label="Nueva transacción" onClick={() => navigate('/transactions')} />

      {selectGoal && <GoalDetailModal goal={selectGoal} onClose={() => setSelectGoal(null)} />}
      {selectionAmount !== null && (
        <GoalSelectionModal
          goals={active}
          amount={selectionAmount}
          onClose={() => setSelectionAmount(null)}
          onDone={() => { setSelectionAmount(null); setAmount(''); setExpanded(false); }}
        />
      )}
    </div>
  );
}
