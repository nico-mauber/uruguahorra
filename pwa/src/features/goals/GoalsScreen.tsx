import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, ProgressBar, Icon, Spinner, EmptyState, Fab } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useGoalsStore, type Goal } from '@/store/useGoalsStore';
import { GoalDetailModal } from './GoalDetailModal';
import {
  goalProgress, goalRemaining, iconForCategory, colorForProgress, daysRemaining, money,
} from './goalHelpers';

/**
 * Pantalla `/goals`. Fuente: docs/features/goals/goals-ui-ux §Pantalla /goals.
 */
export function GoalsScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const goals = useGoalsStore((s) => s.goals);
  const isLoading = useGoalsStore((s) => s.isLoading);
  const fetchGoals = useGoalsStore((s) => s.fetchGoals);
  const getTotalSaved = useGoalsStore((s) => s.getTotalSaved);

  const [selected, setSelected] = useState<Goal | null>(null);

  useEffect(() => {
    if (userId) void fetchGoals(userId);
  }, [userId, fetchGoals]);

  const active = goals.filter((g) => g.isActive);
  const completed = active.filter((g) => goalProgress(g) >= 100).length;
  const totalSaved = getTotalSaved();

  if (isLoading && goals.length === 0) {
    return <Spinner fullscreen label="Cargando tus metas…" />;
  }

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingBottom: 'calc(var(--touch-fab) + var(--space-2xl))' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 10px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary)' }}>🎯 Mis Metas</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
          ✨ Administra y sigue el progreso de tus objetivos de ahorro
        </p>
      </div>

      {/* Stat cards */}
      {active.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px' }}>
          {[
            { label: 'Activas', value: String(active.length) },
            { label: 'Ahorrado', value: money(totalSaved) },
            { label: 'Completas', value: String(completed) },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, minHeight: 65, borderRadius: 12, padding: 12,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ color: '#047857', fontSize: 16, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: '#059669', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Lista o empty */}
      {active.length === 0 ? (
        <div style={{ padding: '48px 20px' }}>
          <EmptyState
            icon="flag"
            title="🌟 ¡Empieza tu viaje!"
            text="🚀 Crea tu primera meta de ahorro y comienza a construir tu futuro financiero con objetivos claros y motivadores"
            action={<Button onClick={() => navigate('/create-goal')}>🎯 Crear mi primera meta</Button>}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', padding: 20 }}>
          {active.map((g) => {
            const progress = goalProgress(g);
            const color = colorForProgress(progress);
            const days = daysRemaining(g.targetDate);
            return (
              <Card key={g.id} onClick={() => setSelected(g)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{g.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textTransform: 'capitalize' }}>
                      {g.category}
                    </div>
                  </div>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                  }}>
                    <Icon name={iconForCategory(g.category)} size={24} color={color} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0' }}>
                  {[
                    { l: 'Ahorrado', v: money(g.savedAmount) },
                    { l: 'Meta', v: money(g.targetAmount) },
                    { l: 'Restante', v: money(goalRemaining(g)) },
                  ].map((c) => (
                    <div key={c.l}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>{c.l}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{c.v}</div>
                    </div>
                  ))}
                </div>

                <ProgressBar progress={progress} color={color} showLabel />

                <p style={{ fontSize: 13, marginTop: 8, color: 'var(--color-text-secondary)' }}>
                  {progress >= 100
                    ? '🎉 ¡Completada!'
                    : days === null
                      ? ''
                      : days <= 0
                        ? '⚠️ Meta vencida'
                        : `⏰ ${days} días restantes`}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <Fab icon="add" label="Crear meta" onClick={() => navigate('/create-goal')} />

      {selected && <GoalDetailModal goal={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
