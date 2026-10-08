import { createFileRoute } from '@tanstack/react-router';
import { Dashboard, pageHead } from '@/components/analytics/dashboard';
export const Route = createFileRoute('/')({
 head: () => pageHead('Social Overview', 'Explore real social sentiment data, trending hashtags, and animated dataset activity with PULSE.'),
 component: Page,
});
function Page() { return <Dashboard view="overview"/>; }
