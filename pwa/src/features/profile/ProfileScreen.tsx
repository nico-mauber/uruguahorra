import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Icon, ProgressBar } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useGoalsStore } from '@/store/useGoalsStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { ChallengesService } from '@/services/ChallengesService';
import { useTheme } from '@/theme/useTheme';

/** Pantalla `/profile`. Fuente: docs/features/profile/{functional,ui-ux}. */
export function ProfileScreen() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const user = useAuthStore((s) => s.user);
  const isPremium = useAuthStore((s) => s.isPremium);
  const signOut = useAuthStore((s) => s.signOut);

  const goals = useGoalsStore((s) => s.goals);
  const fetchGoals = useGoalsStore((s) => s.fetchGoals);
  const stats = useGamificationStore((s) => s.stats);
  const loadStats = useGamificationStore((s) => s.loadStats);

  const [completedChallenges, setCompletedChallenges] = useState(0);

  const userId = user?.id ?? null;
  const displayName = user?.email?.split('@')[0] ?? 'Usuario';

  useEffect(() => {
    if (!userId) return;
    void fetchGoals(userId);
    if (!stats) void loadStats(userId);
    ChallengesService.getCompletedSessionsCount(userId).then(setCompletedChallenges);
  }, [userId, fetchGoals, loadStats, stats]);

  const activeGoals = goals.filter((g) => g.isActive).length;
  const level = stats?.level ?? 1;
  const totalXP = stats?.totalXP ?? 0;
  const currentStreak = stats?.streak.currentStreak ?? 0;
  const levelInfo = stats?.levelInfo;

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', padding: 20, paddingBottom: 'calc(var(--space-4xl))' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}>
          <Icon name="person" size={48} color="var(--color-primary)" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 12 }}>{displayName}</h1>
        <p style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}>{user?.email}</p>
      </div>

      {/* Nivel */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong style={{ fontSize: 18 }}>Nivel {level}</strong>
          {levelInfo && <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{totalXP} / {levelInfo.nextLevelXP} XP</span>}
        </div>
        <ProgressBar progress={levelInfo?.progress ?? 0} color="var(--color-primary)" />
      </Card>

      {/* Grid 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { value: currentStreak, label: 'Racha' },
          { value: totalXP, label: 'Experiencia' },
          { value: activeGoals, label: 'Metas Activas' },
          { value: completedChallenges, label: 'Retos Completados' },
        ].map((s) => (
          <Card key={s.label} style={{ minHeight: 70, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Configuración */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16 }}>Tema oscuro</span>
          <button onClick={toggle} aria-pressed={isDark}
            style={{ width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', position: 'relative', background: isDark ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 200ms' }}>
            <span style={{ position: 'absolute', top: 3, left: isDark ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 200ms' }} />
          </button>
        </div>
      </Card>

      {/* Cuenta */}
      <Card padding="none" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <MenuRow icon="diamond" color="var(--color-warning)" label="Premium"
          badge={isPremium ? undefined : 'Upgrade'} onClick={() => navigate('/paywall')} />
        <MenuRow icon="notifications" label="Notificaciones" onClick={() => navigate('/notifications')} />
        <MenuRow icon="shield" label="Privacidad" onClick={() => navigate('/privacy-policy')} />
        <MenuRow icon="warning" label="Ayuda" onClick={() => { window.location.href = 'mailto:soporte@uruguahorra.uy'; }} last />
      </Card>

      <Button variant="outline" style={{ width: '100%' }} onClick={() => void signOut()}>
        Cerrar sesión
      </Button>
    </div>
  );
}

function MenuRow({ icon, color, label, badge, onClick, last }: {
  icon: 'diamond' | 'notifications' | 'shield' | 'warning'; color?: string; label: string; badge?: string; onClick: () => void; last?: boolean;
}) {
  return (
    <button onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, cursor: 'pointer',
        background: 'none', border: 'none', borderBottom: last ? 'none' : '1px solid var(--color-border)',
        color: 'var(--color-text-primary)', textAlign: 'left',
      }}>
      <Icon name={icon} size={22} color={color} />
      <span style={{ flex: 1, fontSize: 16 }}>{label}</span>
      {badge && (
        <span style={{ padding: '2px 10px', borderRadius: 999, background: 'var(--color-primary)', color: '#fff', fontSize: 12, fontWeight: 600 }}>{badge}</span>
      )}
      <span style={{ color: 'var(--color-text-tertiary)' }}>›</span>
    </button>
  );
}
