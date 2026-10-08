import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '@/components/analytics/dashboard';
import { BigDataLab } from '@/components/analytics/bigdata-lab';
export const Route = createFileRoute('/bloom')({
 head: () => pageHead('Bloom Filter', 'Probabilistic hashtag membership testing with a Bloom filter.'),
 component: Page,
});
function Page() { return <BigDataLab view="bloom"/>; }
