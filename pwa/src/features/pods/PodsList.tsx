import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, ProgressBar } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useSquadsStore } from '@/store/useSquadsStore';
import { CreateSquadModal, JoinSquadModal } from './SquadModals';

/** Sección de pods del dashboard. Fuente: docs/features/pods/pods-ui-ux §PodsList. */
const money = (n: number) => `$${Math.floor(n).toLocaleString('es-UY')}`;
const roleIcon = (role: string) => (role === 'owner' ? '👑' : role === 'admin' ? '⭐' : '👤');

export function PodsList() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const userSquads = useSquadsStore((s) => s.userSquads);
  const isLoading = useSquadsStore((s) => s.isLoading);
  const fetchUserSquads = useSquadsStore((s) => s.fetchUserSquads);

  const [modal, setModal] = useState<'create' | 'join' | null>(null);

  useEffect(() => {
    if (userId) void fetchUserSquads(userId);
  }, [userId, fetchUserSquads]);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>🏛️ Pods de Ahorro ({userSquads.length})</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Ahorra junto a otros usuarios</p>
        </div>
        <button onClick={() => setModal('create')} aria-label="Crear pod" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--color-primary)' }}>⊕</button>
      </div>

      {isLoading && userSquads.length === 0 ? (
        <Card><p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Cargando tus pods…</p></Card>
      ) : userSquads.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 40 }}>👥</span>
            <strong>¡Únete a un Pod de Ahorro!</strong>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Ahorra junto a tus amigos y motívense mutuamente para alcanzar sus metas.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="small" onClick={() => setModal('create')}>Crear Pod</Button>
              <Button size="small" variant="outline" onClick={() => setModal('join')}>Unirse con Código</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {userSquads.map((s) => {
            const progress = s.goalAmount > 0 ? Math.min(100, (s.totalSquadSaved / s.goalAmount) * 100) : 0;
            return (
              <Card key={s.id} style={{ flexShrink: 0, width: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 16 }}>{s.name}</strong>
                  <span title={s.memberRole}>{roleIcon(s.memberRole)}</span>
                </div>
                {s.description && <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</p>}
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.memberCount} miembros</p>
                <div style={{ margin: '8px 0' }}><ProgressBar progress={progress} color="var(--color-primary)" showLabel /></div>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{money(s.totalSquadSaved)} de {money(s.goalAmount)}</p>
                <Button size="small" variant="outline" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate(`/squad/${s.id}`)}>Ver detalle</Button>
              </Card>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {userSquads.length > 0 && (
          <Button size="small" variant="ghost" onClick={() => setModal('join')}>Unirse con código</Button>
        )}
      </div>

      {modal === 'create' && <CreateSquadModal onClose={() => setModal(null)} />}
      {modal === 'join' && <JoinSquadModal onClose={() => setModal(null)} />}
    </div>
  );
}
