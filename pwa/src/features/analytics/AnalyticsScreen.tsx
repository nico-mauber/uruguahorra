import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spinner, Dialog, Button } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import type { PsychologicalInsight } from '@/types/analytics';

/** Pantalla `/analytics`. Fuente: docs/features/analytics/{functional,ui-ux}. */
const money = (n: number) => `$${Math.floor(n).toLocaleString('es-UY')}`;
const CATEGORY_COLOR: Record<PsychologicalInsight['category'], string> = {
  health: '#EF4444', psychological: '#8B5CF6', temporal: '#06B6D4', efficiency: '#F59E0B', motivation: '#10B981',
};
type Tab = 'insights' | 'patterns' | 'forecast';

export function AnalyticsScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const {
    preferences, patterns, summary, insights, forecast, monthlyInsights,
    isLoading, hasRealData, loadAll,
  } = useAnalyticsStore();

  const [tab, setTab] = useState<Tab>('insights');
  const [detail, setDetail] = useState<PsychologicalInsight | null>(null);

  useEffect(() => {
    if (userId) void loadAll(userId);
  }, [userId, loadAll]);

  useEffect(() => {
    if (preferences?.default_tab) setTab(preferences.default_tab);
  }, [preferences?.default_tab]);

  const forecastEnabled = preferences?.enable_spending_forecast ?? true;
  const insightsEnabled = preferences?.enable_psychological_insights ?? true;
  const showQuickStats = preferences?.show_quick_stats ?? true;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'insights', label: '💡 Insights' },
    { key: 'patterns', label: '📈 Patrones' },
    ...(forecastEnabled ? [{ key: 'forecast' as Tab, label: '🔮 Proyección' }] : []),
  ];

  if (isLoading && patterns.length === 0 && insights.length === 0) {
    return <Spinner fullscreen label="Analizando tus datos…" />;
  }

  const latestMonth = monthlyInsights[0];

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingBottom: 'var(--space-2xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>📊 Análisis Financiero</h1>
          <div style={{ fontSize: 11, fontWeight: 500, color: hasRealData ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {hasRealData ? '• Datos reales' : '• Datos de demostración'}
          </div>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 2 }}>Insights psicológicos y patrones de gasto</p>
        </div>
        <button onClick={() => navigate('/analytics-settings')} aria-label="Configuración"
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface)', border: 'none', cursor: 'pointer', fontSize: 18 }}>⚙️</button>
      </div>

      {/* Quick stats */}
      {showQuickStats && summary && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px 16px' }}>
          <Card style={{ flex: '1 1 45%', minHeight: 85 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Gasto del mes</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {money(latestMonth?.total_spent ?? summary.total_expenses)}{' '}
              <span style={{ color: summary.spending_trend === 'up' ? 'var(--color-error)' : summary.spending_trend === 'down' ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                {summary.spending_trend === 'up' ? '↑' : summary.spending_trend === 'down' ? '↓' : '–'}
              </span>
            </div>
          </Card>
          <Card style={{ flex: '1 1 45%', minHeight: 85 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Categoría top</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{summary.top_category ?? 'Sin datos'}</div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 16px' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: tab === t.key ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'transparent',
              color: tab === t.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: tab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
            }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {/* Insights */}
        {tab === 'insights' && (
          !insightsEnabled ? (
            <Empty text="Los insights psicológicos están deshabilitados en tus preferencias." />
          ) : insights.length === 0 ? (
            <Empty text="Agrega más transacciones para obtener insights personalizados" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {insights.map((ins) => {
                const color = CATEGORY_COLOR[ins.category];
                return (
                  <Card key={ins.id} onClick={() => setDetail(ins)} style={{ cursor: 'pointer', border: `1px solid ${color}`, background: `color-mix(in srgb, ${color} 8%, transparent)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{ins.icon}</span>
                      <strong style={{ fontSize: 16 }}>{ins.title}</strong>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--color-text-secondary)', margin: '8px 0' }}>{ins.description}</p>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>💡 {ins.actionable}</p>
                  </Card>
                );
              })}
            </div>
          )
        )}

        {/* Patrones */}
        {tab === 'patterns' && (
          patterns.length === 0 ? (
            <Empty text="No hay suficientes datos para mostrar patrones" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {(() => {
                const max = Math.max(...patterns.map((p) => p.amount), 1);
                return patterns.map((p) => (
                  <Card key={p.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong>{p.category}</strong>
                      <span>{money(p.amount)} · {p.frequency}x</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${(p.amount / max) * 100}%`, background: 'var(--color-primary)' }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>Promedio {money(p.average_amount)}</div>
                  </Card>
                ));
              })()}
            </div>
          )
        )}

        {/* Proyección */}
        {tab === 'forecast' && (
          !forecast ? (
            <Empty text="Necesitas más historial para generar proyecciones" />
          ) : (
            <Card style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Proyección próximos {preferences?.forecast_days ?? 30} días</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-primary)', margin: '8px 0' }}>{money(forecast.predicted_amount)}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Confianza: {(forecast.confidence * 100).toFixed(1)}%</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4, color: forecast.trend === 'up' ? 'var(--color-error)' : forecast.trend === 'down' ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                Tendencia: {forecast.trend === 'up' ? 'Al alza' : forecast.trend === 'down' ? 'A la baja' : 'Estable'}
              </div>
            </Card>
          )
        )}
      </div>

      {detail && (
        <Dialog open onClose={() => setDetail(null)} title={detail.title}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ lineHeight: 1.5 }}>{detail.description}</p>
            <p style={{ fontWeight: 500 }}>💡 Acción recomendada:</p>
            <p style={{ color: 'var(--color-text-secondary)' }}>{detail.actionable}</p>
            <Button onClick={() => setDetail(null)}>Entendido</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
      <p style={{ color: 'var(--color-text-secondary)' }}>{text}</p>
    </Card>
  );
}
