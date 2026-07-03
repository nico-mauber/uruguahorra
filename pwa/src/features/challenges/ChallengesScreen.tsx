import { useEffect, useState } from 'react';
import { Card, Spinner } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useChallengesStore } from '@/store/useChallengesStore';
import type { ChallengeRow, UserChallengeSessionRow } from '@/types/database';
import { DIFFICULTY_COLOR } from './challengeHelpers';
import { DurationModal } from './DurationModal';
import { ChallengeCheckinModal } from './ChallengeCheckinModal';

/**
 * Pantalla `/challenges`. Fuente: docs/features/challenges/{functional,ui-ux}.
 */
export function ChallengesScreen() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const {
    categories, challengesByCategory, activeSessions, progressBySession,
    selectedCategoryId, isLoading, loadInitial, selectCategory,
  } = useChallengesStore();

  const [durationFor, setDurationFor] = useState<ChallengeRow | null>(null);
  const [checkinFor, setCheckinFor] = useState<UserChallengeSessionRow | null>(null);

  useEffect(() => {
    if (userId) void loadInitial(userId);
  }, [userId, loadInitial]);

  if (!userId) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Debes iniciar sesión para ver los retos.</div>;
  }

  const challenges = selectedCategoryId ? challengesByCategory[selectedCategoryId] ?? [] : [];
  const limitReached = activeSessions.length >= 5;
  const activeChallengeIds = new Set(activeSessions.map((s) => s.challenge_id));

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingBottom: 'var(--space-2xl)' }}>
      {/* 1. Retos activos */}
      <div style={{ padding: 16, background: 'var(--color-surface)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          Retos Activos ({activeSessions.length}/5)
        </h2>
        {activeSessions.length === 0 ? (
          <p style={{ fontStyle: 'italic', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No tienes retos activos. ¡Selecciona uno para comenzar!
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {activeSessions.map((s) => {
              const p = progressBySession[s.id];
              const progress = p?.currentProgress ?? s.progress ?? 0;
              const behind = p && !p.isOnTrack && progress > 0;
              return (
                <button
                  key={s.id}
                  onClick={() => setCheckinFor(s)}
                  style={{
                    flexShrink: 0, width: 150, minHeight: 80, borderRadius: 8, padding: 12, textAlign: 'left',
                    background: 'var(--color-background)', cursor: 'pointer', position: 'relative',
                    border: '1px solid var(--color-border)',
                    borderLeft: behind ? '3px solid var(--color-warning)' : '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {s.challenge?.title ?? 'Reto'}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{Math.round(progress)}% completado</div>
                  {p && <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>{p.daysCompleted}/{p.totalDaysRequired} días</div>}
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)', marginTop: 6 }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, progress)}%`, background: 'var(--color-primary)' }} />
                  </div>
                  {behind && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-warning)', marginTop: 4 }}>⚠️ Atraso</div>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Categorías */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map((c) => {
            const selected = c.id === selectedCategoryId;
            return (
              <button
                key={c.id}
                onClick={() => void selectCategory(c.id)}
                style={{
                  flexShrink: 0, minWidth: 80, maxWidth: 100, padding: '12px 16px', borderRadius: 20,
                  border: 'none', cursor: 'pointer', textAlign: 'center',
                  background: selected ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: selected ? '#fff' : 'var(--color-text-primary)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ fontSize: 24 }}>{c.icon ?? '🎯'}</div>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1, marginTop: 4 }}>{c.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Retos disponibles */}
      <div style={{ padding: '0 16px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Retos Disponibles</h2>
        {isLoading && challenges.length === 0 ? (
          <Spinner label="Cargando retos…" />
        ) : challenges.length === 0 ? (
          <p style={{ fontStyle: 'italic', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No hay retos disponibles en esta categoría
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {challenges.map((ch) => {
              const isActive = activeChallengeIds.has(ch.id);
              const disabled = isActive || (limitReached && !isActive);
              return (
                <Card
                  key={ch.id}
                  onClick={() => !disabled && setDurationFor(ch)}
                  style={{ opacity: isActive ? 0.6 : 1, cursor: disabled ? 'default' : 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                    <strong style={{ flex: 1, fontSize: 16 }}>{ch.title}</strong>
                    <span style={{
                      padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', color: '#fff', background: DIFFICULTY_COLOR[ch.difficulty],
                    }}>{ch.difficulty}</span>
                  </div>
                  {ch.description && (
                    <p style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-secondary)', margin: '8px 0' }}>{ch.description}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>+{ch.xp_reward} XP</span>
                    {isActive ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success)' }}>✓ Activo</span>
                    ) : limitReached ? (
                      <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>Límite alcanzado</span>
                    ) : (
                      <span style={{ fontSize: 22, color: 'var(--color-primary)' }}>⊕</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {durationFor && <DurationModal challenge={durationFor} onClose={() => setDurationFor(null)} />}
      {checkinFor && <ChallengeCheckinModal session={checkinFor} onClose={() => setCheckinFor(null)} />}
    </div>
  );
}
