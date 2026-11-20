import { AppShell } from '../components/shell/AppShell';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';

export default function HomePage() {
  return (
    <AppShell title="Dashboard">
      <DashboardOverview />
    </AppShell>
  );
}
