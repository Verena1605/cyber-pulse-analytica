import { createFileRoute } from '@tanstack/react-router';
import { Dashboard, pageHead } from '@/components/analytics/dashboard';
export const Route = createFileRoute('/live')({
 head: () => pageHead('Live Dataset Stream', 'Watch real historical social posts in an animated, clearly labeled dataset replay.'),
 component: Page,
});
function Page() { return <Dashboard view="live"/>; }
