import { createFileRoute } from '@tanstack/react-router';
import { Dashboard, pageHead } from '@/components/analytics/dashboard';
export const Route = createFileRoute('/sources')({
 head: () => pageHead('Data Sources', 'Inspect available datasets and social network connection status.'),
 component: Page,
});
function Page() { return <Dashboard view="sources"/>; }
