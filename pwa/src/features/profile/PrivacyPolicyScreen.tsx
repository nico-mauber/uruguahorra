import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components';

/** Página estática de privacidad. Fuente: docs/features/profile §Privacidad. */
export function PrivacyPolicyScreen() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingBottom: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: 16, borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate(-1)} aria-label="Volver" style={{ background: 'none', border: 'none', cursor: 'pointer', width: 40, color: 'var(--color-text-primary)' }}>
          <Icon name="arrow-back" size={24} />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600 }}>Privacidad</h1>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: 20, lineHeight: 1.6, color: 'var(--color-text-secondary)', fontSize: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>Política de Privacidad</h2>
        <p style={{ marginTop: 12 }}>
          UruguAhorra respeta tu privacidad. Tus datos financieros (metas, transacciones,
          contribuciones) se almacenan de forma segura y sólo son accesibles por tu cuenta.
        </p>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 16 }}>Datos que recopilamos</h3>
        <p style={{ marginTop: 8 }}>
          Email, metas de ahorro, transacciones y actividad dentro de la app para brindarte
          insights y gamificación. No compartimos tus datos con terceros con fines publicitarios.
        </p>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 16 }}>Seguridad</h3>
        <p style={{ marginTop: 8 }}>
          El acceso a tus datos está protegido con Row Level Security a nivel de base de datos:
          cada usuario sólo puede ver y modificar su propia información.
        </p>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 16 }}>Tus derechos</h3>
        <p style={{ marginTop: 8 }}>
          Podés solicitar la eliminación de tu cuenta y datos en cualquier momento escribiendo
          a soporte@uruguahorra.uy.
        </p>
      </div>
    </div>
  );
}
