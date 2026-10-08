import { createFileRoute } from '@tanstack/react-router';
import { Dashboard, pageHead } from '@/components/analytics/dashboard';
export const Route = createFileRoute('/trends')({
 head: () => pageHead('Trending Topics', 'Discover the most discussed hashtags in real TweetEval social media posts.'),
 component: Page,
});
function Page() { return <Dashboard view="trends"/>; }
