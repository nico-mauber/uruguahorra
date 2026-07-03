import { useState } from 'react';
import { Dialog, Button, Input } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useSquadsStore } from '@/store/useSquadsStore';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';

/** Modales de pods. Fuente: docs/features/pods/pods-ui-ux.md. */

const money = (n: number) => `$${Math.floor(n).toLocaleString('es-UY')}`;

/** Crear pod. Al éxito muestra el código de invitación. */
export function CreateSquadModal({ onClose }: { onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const createSquad = useSquadsStore((s) => s.createSquad);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  async function submit() {
    if (!userId || !name.trim()) {
      ToastService.warning('Falta el nombre', 'Ingresa un nombre para el pod');
      return;
    }
    setBusy(true);
    try {
      const squad = await createSquad(userId, {
        name: name.trim(),
        description: description.trim() || undefined,
        maxMembers: Number(maxMembers) || 10,
      });
      setCode(squad.invite_code);
    } catch (error) {
      ToastService.error('No se pudo crear', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Crear Pod de Ahorro">
      {code ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p>¡Pod creado! Comparte este código:</p>
          <div style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 700, letterSpacing: 8, color: 'var(--color-primary)' }}>{code}</div>
          <Button onClick={() => { void navigator.clipboard?.writeText(code); ToastService.success('Código copiado'); }}>Copiar código</Button>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Input placeholder="Nombre *" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            style={{ width: '100%', borderRadius: 12, padding: 10, resize: 'none', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontFamily: 'inherit' }} />
          <label style={{ fontSize: 14 }}>Máximo de miembros
            <Input type="number" inputMode="numeric" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button style={{ flex: 1 }} loading={busy} onClick={() => void submit()}>Crear</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** Unirse por código. */
export function JoinSquadModal({ onClose }: { onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const joinSquad = useSquadsStore((s) => s.joinSquad);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!userId || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await joinSquad(userId, code);
      ToastService.success('¡Te uniste al pod!');
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Unirse a un Pod">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="CÓDIGO"
          style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 24, letterSpacing: 6, padding: 12, borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
        {error && <p style={{ color: 'var(--color-error)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button style={{ flex: 1 }} loading={busy} disabled={code.length !== 6} onClick={() => void submit()}>Unirse</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Contribuir al pod. */
export function ContributeModal({ squadId, onClose }: { squadId: string; onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const addContribution = useSquadsStore((s) => s.addSquadContribution);
  const isAdding = useSquadsStore((s) => s.isAddingContribution);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  async function submit() {
    if (!userId) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      ToastService.warning('Monto inválido', 'Ingresa un monto válido');
      return;
    }
    try {
      await addContribution({ squadId, userId, amount: n, description: description.trim() || undefined, source: 'manual' });
      ToastService.success('¡Contribución agregada!', `${money(n)} agregados al pod`);
      onClose();
    } catch (error) {
      ToastService.error('No se pudo contribuir', getErrorMessage(error));
    }
  }

  return (
    <Dialog open onClose={onClose} title="Contribuir al Pod">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <Input type="number" inputMode="numeric" prefix="$" placeholder="Ej: 100" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <textarea placeholder="Ej: Ahorro semanal" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          style={{ width: '100%', borderRadius: 12, padding: 10, resize: 'none', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button style={{ flex: 1 }} loading={isAdding} onClick={() => void submit()}>Contribuir</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Editar meta del pod. */
export function EditGoalModal({ squadId, currentGoal, onClose }: { squadId: string; currentGoal: number; onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const updateGoal = useSquadsStore((s) => s.updateSquadGoal);
  const isUpdating = useSquadsStore((s) => s.isUpdatingGoal);
  const [goal, setGoal] = useState(String(currentGoal));

  async function submit() {
    if (!userId) return;
    const n = Number(goal);
    if (!Number.isFinite(n) || n <= 0) {
      ToastService.warning('Meta inválida', 'Ingresa una meta válida');
      return;
    }
    try {
      await updateGoal(squadId, n, userId);
      ToastService.success('¡Meta actualizada!', `Nueva meta: ${money(n)}`);
      onClose();
    } catch (error) {
      ToastService.error('No se pudo actualizar', getErrorMessage(error));
    }
  }

  return (
    <Dialog open onClose={onClose} title="Editar Meta del Pod">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <Input type="number" inputMode="numeric" prefix="$" placeholder="Ej: 10000" value={goal} onChange={(e) => setGoal(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button style={{ flex: 1 }} loading={isUpdating} onClick={() => void submit()}>Actualizar</Button>
        </div>
      </div>
    </Dialog>
  );
}
