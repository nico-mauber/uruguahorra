import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Icon, Spinner } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import type { AnalyticsPreferences, AnalyticsPreferencesPatch } from '@/types/analytics';
import { ToastService } from '@/lib/toast';

/** Pantalla `/analytics-settings`. Fuente: docs/features/analytics §CU-2, ui-ux. */
export function AnalyticsSettingsScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const preferences = useAnalyticsStore((s) => s.preferences);
  const loadPreferences = useAnalyticsStore((s) => s.loadPreferences);
  const updatePreference = useAnalyticsStore((s) => s.updatePreference);
  const resetPreferences = useAnalyticsStore((s) => s.resetPreferences);

  useEffect(() => {
    if (userId && !preferences) void loadPreferences(userId);
  }, [userId, preferences, loadPreferences]);

  if (!userId || !preferences) {
    return <Spinner fullscreen label="Cargando preferencias…" />;
  }

  async function save(patch: AnalyticsPreferencesPatch) {
    if (!userId) return;
    const ok = await updatePreference(userId, patch);
    if (ok) ToastService.success('Configuración actualizada');
    else ToastService.error('Error al guardar la configuración');
  }

  async function handleReset() {
    if (!userId) return;
    if (!confirm('¿Restaurar los valores por defecto?')) return;
    await resetPreferences(userId);
    ToastService.success('Configuración restaurada');
  }

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingBottom: 'var(--space-2xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: 16, borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate(-1)} aria-label="Volver" style={{ background: 'none', border: 'none', cursor: 'pointer', width: 40, color: 'var(--color-text-primary)' }}>
          <Icon name="arrow-back" size={24} />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600 }}>Configuración de Análisis</h1>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Períodos */}
        <Section title="Períodos de análisis">
          <NumberRow label="Patrones de gasto (días)" value={preferences.spending_patterns_days} min={7} max={365}
            onChange={(v) => void save({ spending_patterns_days: v })} />
          <NumberRow label="Insights mensuales (meses)" value={preferences.monthly_insights_months} min={1} max={48}
            onChange={(v) => void save({ monthly_insights_months: v })} />
          <NumberRow label="Proyección (días)" value={preferences.forecast_days} min={7} max={365}
            onChange={(v) => void save({ forecast_days: v })} />
        </Section>

        {/* Interfaz */}
        <Section title="Interfaz">
          <PickerRow label="Pestaña inicial" value={preferences.default_tab}
            options={[['insights', 'Insights'], ['patterns', 'Patrones'], ['forecast', 'Proyección']]}
            onChange={(v) => void save({ default_tab: v as AnalyticsPreferences['default_tab'] })} />
          <NumberRow label="Máx. insights por tipo" value={preferences.max_insights_per_type} min={1} max={5}
            onChange={(v) => void save({ max_insights_per_type: v })} />
        </Section>

        {/* Funciones */}
        <Section title="Funciones">
          <ToggleRow label="Insights psicológicos" checked={preferences.enable_psychological_insights}
            onChange={(v) => void save({ enable_psychological_insights: v })} />
          <ToggleRow label="Proyección de gastos" checked={preferences.enable_spending_forecast}
            onChange={(v) => void save({ enable_spending_forecast: v })} />
          <ToggleRow label="Notificaciones push" checked={preferences.enable_push_notifications}
            onChange={(v) => void save({ enable_push_notifications: v })} />
        </Section>

        {/* Localización */}
        <Section title="Localización">
          <PickerRow label="Idioma" value={preferences.preferred_language}
            options={[['es', 'Español'], ['en', 'English']]}
            onChange={(v) => void save({ preferred_language: v as AnalyticsPreferences['preferred_language'] })} />
          <PickerRow label="Moneda" value={preferences.currency}
            options={[['UYU', 'UYU'], ['USD', 'USD'], ['EUR', 'EUR']]}
            onChange={(v) => void save({ currency: v as AnalyticsPreferences['currency'] })} />
          <PickerRow label="Formato de fecha" value={preferences.date_format}
            options={[['DD/MM/YYYY', 'DD/MM/YYYY'], ['MM/DD/YYYY', 'MM/DD/YYYY'], ['YYYY-MM-DD', 'YYYY-MM-DD']]}
            onChange={(v) => void save({ date_format: v as AnalyticsPreferences['date_format'] })} />
        </Section>

        <Button variant="outline" onClick={() => void handleReset()} style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
          Restaurar valores por defecto
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </Card>
  );
}

function NumberRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14, flex: 1 }}>{label} <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>({min}–{max})</span></span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Stepper onClick={() => onChange(clamp(value - 1))}>−</Stepper>
        <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>{value}</span>
        <Stepper onClick={() => onChange(clamp(value + 1))}>+</Stepper>
      </div>
    </div>
  );
}

function Stepper({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-primary)' }}>{children}</button>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <button onClick={() => onChange(!checked)} aria-pressed={checked}
        style={{ width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', position: 'relative', background: checked ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 200ms' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 200ms' }} />
      </button>
    </div>
  );
}

function PickerRow({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
