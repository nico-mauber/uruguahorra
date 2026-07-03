import { Outlet } from 'react-router-dom';
import { TabBar } from '@/components';

/** Layout con tab bar inferior para las rutas principales. Fuente: docs/architecture/pwa §7. */
export function TabsLayout() {
  return (
    <>
      <main>
        <Outlet />
      </main>
      <TabBar />
    </>
  );
}
