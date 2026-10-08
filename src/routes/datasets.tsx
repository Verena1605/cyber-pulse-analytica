import { createFileRoute } from '@tanstack/react-router';
import { Dashboard, pageHead } from '@/components/analytics/dashboard';
export const Route = createFileRoute('/datasets')({
 head: () => pageHead('Dataset Lab', 'Explore, filter, import, and export real labeled social media datasets.'),
 component: Page,
});
function Page() { return <Dashboard view="datasets"/>; }
