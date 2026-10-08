import rawTweets from './tweets.json';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type Post = { id: number; text: string; sentiment: Sentiment };
export const posts: Post[] = rawTweets as Post[];
export const sentimentOrder: Sentiment[] = ['positive', 'neutral', 'negative'];
export function analyze(rows: Post[]) {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  const tags = new Map<string, { count: number; positive: number; negative: number; neutral: number }>();
  rows.forEach(post => {
    counts[post.sentiment]++;
    [...new Set(post.text.match(/#[\w]+/g)?.map(tag => tag.toLowerCase()) ?? [])].forEach(tag => {
      const value = tags.get(tag) ?? { count: 0, positive: 0, negative: 0, neutral: 0 };
      value.count++; value[post.sentiment]++; tags.set(tag, value);
    });
  });
  return { counts, tags: [...tags.entries()].map(([name, values]) => ({ name, ...values })).sort((a,b) => b.count-a.count), total: rows.length };
}
export const summary = analyze(posts);
export const series = Array.from({length: 24}, (_,i) => {
  const batch = posts.slice(i * 511, (i + 1) * 511);
  return { batch: `${String(i + 1).padStart(2,'0')}`, ...analyze(batch).counts };
});
export function exportPosts(rows: Post[]) {
  const csv = 'id,text,sentiment\n' + rows.map(p => `${p.id},"${p.text.replaceAll('"','""')}",${p.sentiment}`).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a'); anchor.href=url; anchor.download='pulse-sentiment.csv'; anchor.click(); URL.revokeObjectURL(url);
}
