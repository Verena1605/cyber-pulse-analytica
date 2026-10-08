import { describe, expect, it } from 'vitest';
import { posts } from '@/data/analysis';
import { Bloom, bloomTest, hashtagNetwork, wordCount, asciiSum } from '@/lib/bigdata';

describe('MapReduce word count', () => {
  it('gives identical results with or without combiner and any mapper count', () => {
    const a = wordCount(posts, 4, false, 20); const b = wordCount(posts, 8, true, 20);
    expect(b.result).toEqual(a.result);
    expect(b.combined).toBeLessThan(b.mapOutput);
  });
});
describe('Bloom filter', () => {
  it('never gives a false negative and reports verdicts', () => {
    const f = new Bloom(11, 7, 2); const set = new Set(['spark', 'hadoop', 'hive']); set.forEach(w => f.add(w));
    set.forEach(w => expect(bloomTest(f, set, w)).toBe('True positive'));
    expect(asciiSum('ab')).toBe(195);
  });
});
describe('Hashtag network', () => {
  it('builds a graph from the dataset', () => {
    const g = hashtagNetwork(posts, 40, "force");
    expect(g.communities).toBeGreaterThan(1);
    expect(g.nodes.length).toBeGreaterThan(5);
  });
});
