import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '@/components/analytics/dashboard';
import { BigDataLab } from '@/components/analytics/bigdata-lab';
export const Route = createFileRoute('/network')({
 head: () => pageHead('Social Network Analysis', 'Hashtag co-occurrence graph with degree distribution and community detection.'),
 component: Page,
});
function Page() { return <BigDataLab view="network"/>; }
