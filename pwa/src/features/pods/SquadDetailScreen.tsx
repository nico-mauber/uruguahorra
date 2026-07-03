import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, ProgressBar, Spinner, Icon } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useSquadsStore } from '@/store/useSquadsStore';
import type { SquadMemberRow } from '@/types/database';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';
import { ContributeModal, EditGoalModal } from './SquadModals';

/** Detalle de pod `/squad/:id`. Fuente: docs/features/pods/{functional §CU-4, ui-ux}. */
const money = (n: number) => `$${Math.floor(n).toLocaleString('es-UY')}`;

function memberName(m: SquadMemberRow): string {
  const email = m.user?.email;
  if (email) return email.split('@')[0];
  return `Usuario ${m.user_id.slice(-4)}`;
}

const RANK_BADGE = ['🏆', '🥈', '🎗️'];
const RANK_COLOR = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function SquadDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const getSquadById = useSquadsStore((s) => s.getSquadById);
  const squadMembers = useSquadsStore((s) => s.squadMembers);
  const fetchSquadMembers = useSquadsStore((s) => s.fetchSquadMembers);
  const fetchUserSquads = useSquadsStore((s) => s.fetchUserSquads);
  const leaveSquad = useSquadsStore((s) => s.leaveSquad);

  const [modal, setModal] = useState<'contribute' | 'goal' | null>(null);
  const [leaving, setLeaving] = useState(false);

  const squad = id ? getSquadById(id) : undefined;
  const members = id ? squadMembers[id] ?? [] : [];

  useEffect(() => {
    if (userId && !squad) void fetchUserSquads(userId);
  }, [userId, squad, fetchUserSquads]);

  useEffect(() => {
    if (id) void fetchSquadMembers(id, true);
  }, [id, fetchSquadMembers]);

  if (!squad) {
    return (
      <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Spinner label="Cargando pod…" />
        <Button variant="ghost" onClick={() => navigate('/')}>Volver</Button>
      </div>
    );
  }

  const progress = squad.goalAmount > 0 ? Math.min(100, (squad.totalSquadSaved / squad.goalAmount) * 100) : 0;
  const ranked = [...members].sort((a, b) => b.total_saved - a.total_saved);

  function copyCode() {
    if (!squad) return;
    void navigator.clipboard?.writeText(squad.inviteCode);
    ToastService.success('Código copiado', squad.inviteCode);
  }

  async function handleLeave() {
    if (!userId || !id) return;
    if (squad?.memberRole === 'owner') {
      ToastService.info('Transferir grupo', 'Como creador necesitas transferir el liderazgo antes de salir (próximamente)');
      return;
    }
    if (!confirm(`¿Estás seguro que quieres salir de «${squad?.name}»?`)) return;
    setLeaving(true);
    try {
      await leaveSquad(id, userId);
      ToastService.success(`Has salido de «${squad?.name}»`);
      navigate('/');
    } catch (error) {
      ToastService.error('No se pudo salir', getErrorMessage(error));
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingBottom: 'var(--space-2xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: 16, borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate(-1)} aria-label="Volver" style={{ background: 'none', border: 'none', cursor: 'pointer', width: 40, color: 'var(--color-text-primary)' }}>
          <Icon name="flag" size={24} />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600 }}>Detalle del Grupo</h1>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Card principal */}
        <Card>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>{squad.name}</h2>
          {squad.description && <p style={{ fontSize: 16, lineHeight: 1.4, color: 'var(--color-text-secondary)', marginTop: 4 }}>{squad.description}</p>}
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8 }}>
            👥 {squad.memberCount}/{squad.maxMembers} miembros · 🛡️ {squad.memberRole === 'owner' ? 'Creador' : 'Admin'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <Button size="small" onClick={copyCode}>➕ Invitar</Button>
            <Button size="small" onClick={() => setModal('contribute')}>👛 Contribuir</Button>
            <Button size="small" variant="outline" onClick={() => setModal('goal')}>🚩 Meta</Button>
            <Button size="small" variant="outline" loading={leaving} onClick={() => void handleLeave()} style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>🚪 Salir</Button>
          </div>
        </Card>

        {/* Stats */}
        <Card>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{money(squad.totalSquadSaved)}</div>
          <div style={{ margin: '8px 0' }}><ProgressBar progress={progress} color="var(--color-primary)" showLabel /></div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {Math.round(progress)}% completado · Meta {money(squad.goalAmount)} · {squad.memberCount} miembros
          </p>
        </Card>

        {/* Ranking */}
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🏆 Ranking de Ahorros</h3>
          {ranked.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>No hay miembros para mostrar</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ranked.map((m, i) => {
                const isMe = m.user_id === userId;
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 28, textAlign: 'center', fontWeight: 700, color: i < 3 ? RANK_COLOR[i] : 'var(--color-text-secondary)' }}>
                      {i < 3 ? RANK_BADGE[i] : `#${i + 1}`}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 500 }}>{memberName(m)}</span>
                      {isMe && <span style={{ color: 'var(--color-primary)', fontSize: 13 }}> (Tú)</span>}
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{m.role === 'owner' ? 'Creador' : 'Admin'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{money(m.total_saved)}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{money(m.monthly_saved)} este mes</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {modal === 'contribute' && <ContributeModal squadId={squad.id} onClose={() => setModal(null)} />}
      {modal === 'goal' && <EditGoalModal squadId={squad.id} currentGoal={squad.goalAmount} onClose={() => setModal(null)} />}
    </div>
  );
}
