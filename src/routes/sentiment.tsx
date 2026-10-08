import { createFileRoute } from '@tanstack/react-router';
import { Dashboard, pageHead } from '@/components/analytics/dashboard';
export const Route = createFileRoute('/sentiment')({
 head: () => pageHead('Sentiment Analysis', 'Explore positive, negative, and neutral opinions in the TweetEval benchmark.'),
 component: Page,
});
function Page() { return <Dashboard view="sentiment"/>; }
