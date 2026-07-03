import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Spinner } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useGoalsStore } from '@/store/useGoalsStore';
import { GoalsService } from '@/services/GoalsService';
import { GoalTypesService } from '@/services/GoalTypesService';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';
import { logger, LogModule } from '@/lib/logger';
import type { GoalTypeRow } from '@/types/database';
import { money } from './goalHelpers';

/**
 * Pantalla `/create-goal` — wizard 2 pasos.
 * Fuente: docs/features/goals/goals-functional-specs §CU-2, goals-ui-ux §/create-goal.
 */
interface TypeOption {
  id: string | null; // null = personalizada
  label: string;
  name: string; // prellenado de nombre
  months: number;
  category: string;
  color: string;
  icon: string;
  description: string | null;
}

const CUSTOM_OPTION: TypeOption = {
  id: null,
  label: '🎨 Meta personalizada',
  name: 'Mi Meta Personal',
  months: 6,
  category: 'custom',
  color: '#339AF0',
  icon: 'flag',
  description: 'Define claramente tu objetivo y el monto que quieres alcanzar.',
};

function toOption(t: GoalTypeRow): TypeOption {
  return {
    id: t.id,
    label: `${t.emoji ?? '🎯'} ${t.name}`,
    name: `Mi ${t.name}`,
    months: t.suggested_duration_months ?? 6,
    category: t.category ?? 'general',
    color: t.color ?? '#339AF0',
    icon: t.icon ?? 'flag',
    description: t.description,
  };
}

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function CreateGoalScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const fetchGoals = useGoalsStore((s) => s.fetchGoals);

  const [step, setStep] = useState<1 | 2>(1);
  const [types, setTypes] = useState<TypeOption[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [selected, setSelected] = useState<TypeOption | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await GoalTypesService.getAllGoalTypes();
        if (alive) setTypes([CUSTOM_OPTION, ...rows.map(toOption)]);
      } catch (error) {
        logger.warn(LogModule.GOALS, 'Fallo carga de tipos, usando custom', error);
        if (alive) setTypes([CUSTOM_OPTION]);
      } finally {
        if (alive) setLoadingTypes(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Sin usuario: guard.
  if (!userId) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: '60dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
        <p>Debes iniciar sesión para crear una meta.</p>
        <Button onClick={() => navigate('/onboarding')}>Ir al inicio</Button>
      </div>
    );
  }

  function pickType(t: TypeOption) {
    setSelected(t);
    setName(t.name);
    setMonths(String(t.months));
    setAmount('');
    setStep(2);
  }

  async function handleCreate() {
    if (!selected) return;
    if (!name.trim()) {
      ToastService.warning('Falta el nombre', 'Por favor ingresa un nombre para tu meta');
      return;
    }
    const amt = Number(amount);
    if (!amount) {
      ToastService.warning('Falta el monto', 'Por favor ingresa el monto objetivo');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      ToastService.warning('Monto inválido', 'Por favor ingresa un monto válido mayor a 0');
      return;
    }
    const m = Number(months) || 3;

    setSaving(true);
    try {
      await GoalsService.createGoal(userId!, {
        name: name.trim(),
        target_amount: amt,
        target_date: addMonths(m),
        category: selected.category,
        color: selected.color,
        icon: selected.icon,
        goal_type_id: selected.id,
      });
      await fetchGoals(userId!, true);
      ToastService.success('¡Éxito!', 'Tu meta ha sido creada correctamente');
      navigate('/goals', { replace: true });
    } catch (error) {
      ToastService.error('No se pudo crear', getErrorMessage(error, { context: 'goal' }));
    } finally {
      setSaving(false);
    }
  }

  const amt = Number(amount);
  const m = Number(months) || 0;
  const showCalc = amount && m > 0 && Number.isFinite(amt) && amt > 0;

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', padding: 'var(--space-xl)', minHeight: '100dvh' }}>
      {/* Dots de paso */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
        {[1, 2].map((n) => (
          <span key={n} style={{
            height: 8, borderRadius: 4,
            width: step === n ? 24 : 8,
            background: step === n ? 'var(--color-primary)' : 'var(--color-border)',
            transition: 'width 200ms',
          }} />
        ))}
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        {step === 1 ? '¿Cuál es tu meta?' : 'Personaliza tu meta'}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>
        {step === 1 ? 'Elige lo que más te motive' : 'Define los detalles de tu objetivo'}
      </p>

      {step === 1 ? (
        loadingTypes ? (
          <Spinner label="Cargando tipos de metas…" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {types.map((t) => (
              <button
                key={t.id ?? 'custom'}
                onClick={() => pickType(t)}
                style={{
                  textAlign: 'left', padding: 16, borderRadius: 16, fontSize: 18,
                  background: 'var(--color-surface)', cursor: 'pointer',
                  border: selected?.id === t.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {selected?.description && (
            <Card style={{ background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
              <strong>💡 Consejo</strong>
              <p style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-secondary)' }}>{selected.description}</p>
            </Card>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Nombre</span>
            <Input placeholder="Ej: Mi objetivo personal" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Monto objetivo</span>
            <Input type="number" inputMode="decimal" prefix="$" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Plazo (meses)</span>
            <Input type="number" inputMode="numeric" placeholder="6" value={months} onChange={(e) => setMonths(e.target.value)} />
          </label>

          {showCalc && (
            <Card style={{ background: 'color-mix(in srgb, var(--color-success) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 20%, transparent)' }}>
              <strong>📊 Tu plan de ahorro</strong>
              <p style={{ marginTop: 4, fontSize: 14 }}>Necesitas ahorrar: <strong>{money(amt / m)}</strong> por mes</p>
              <p style={{ fontSize: 14 }}>≈ <strong>{money(amt / (m * 30))}</strong> por día</p>
            </Card>
          )}
        </div>
      )}

      {/* Botones */}
      {saving ? (
        <div style={{ marginTop: 24 }}><Spinner label="Guardando tu meta…" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
          {step === 2 && <Button size="large" onClick={() => void handleCreate()}>Crear meta</Button>}
          <Button variant="outline" size="large" style={{ opacity: 0.7 }}
            onClick={() => (step === 2 ? setStep(1) : navigate(-1))}>
            {step === 2 ? 'Volver' : 'Cancelar'}
          </Button>
        </div>
      )}
    </div>
  );
}
