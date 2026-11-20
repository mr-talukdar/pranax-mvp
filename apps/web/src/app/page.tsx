import { getStudioContext } from '../server/auth/context';
import { getDashboardSummary } from '../server/services/dashboard';
import { AppShell } from '../components/shell/AppShell';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';

export default async function HomePage() {
  let initialData = undefined;
  try {
    const context = await getStudioContext();
    if (context) {
      initialData = await getDashboardSummary(context);
    }
  } catch {
    // When no server session is established, falls back to client prototype/mock mode
  }

  return (
    <AppShell title="Dashboard">
      <DashboardOverview initialData={initialData} />
    </AppShell>
  );
}
