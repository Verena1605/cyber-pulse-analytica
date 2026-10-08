import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '@/components/analytics/dashboard';
import { BigDataLab } from '@/components/analytics/bigdata-lab';
export const Route = createFileRoute('/mapreduce')({
 head: () => pageHead('MapReduce Word Count', 'Map, shuffle and reduce word counts over the TweetEval corpus.'),
 component: Page,
});
function Page() { return <BigDataLab view="mapreduce"/>; }
