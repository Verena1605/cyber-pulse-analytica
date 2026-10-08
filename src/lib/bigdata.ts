import type { Post } from '@/data/analysis';

// ---------- Exp 4: MapReduce word count ----------
const stop = new Set(['the','a','an','and','or','to','of','in','is','it','i','you','for','on','with','at','this','that','my','me','be','are','was','so','but','not','have','just','user','rt','im','its','your','we','he','she','they','do','if','as','from','by','all','get','will','can','what','when','out','up','one','like','about']);
export const tokenize = (text: string) => (text.toLowerCase().match(/#?[a-z][a-z']{2,}/g) ?? []).filter(w => !stop.has(w));

export type KV = [string, number];
export type MapReduceRun = {
  splits: { index: number; records: number; pairs: number }[];
  mapOutput: number; combined: number; keys: number; sample: KV[]; shuffled: [string, number[]][]; result: KV[];
};

/** Splits the corpus across `mappers`, emits (word,1), shuffles/groups by key and reduces by summing. */
export function wordCount(rows: Post[], mappers: number, useCombiner: boolean, top = 15): MapReduceRun {
  const size = Math.ceil(rows.length / mappers);
  const groups = new Map<string, number[]>();
  const splits: MapReduceRun['splits'] = [];
  const sample: KV[] = [];
  let mapOutput = 0, combined = 0;
  for (let m = 0; m < mappers; m++) {
    const chunk = rows.slice(m * size, (m + 1) * size);
    const emitted: KV[] = chunk.flatMap(p => tokenize(p.text).map((w): KV => [w, 1]));
    if (m === 0) sample.push(...emitted.slice(0, 8));
    mapOutput += emitted.length;
    let out: KV[] = emitted;
    if (useCombiner) { // local, per-mapper pre-aggregation
      const local = new Map<string, number>();
      emitted.forEach(([w, c]) => local.set(w, (local.get(w) ?? 0) + c));
      out = [...local.entries()];
    }
    combined += out.length;
    splits.push({ index: m + 1, records: chunk.length, pairs: out.length });
    out.forEach(([w, c]) => { const g = groups.get(w); if (g) g.push(c); else groups.set(w, [c]); });
  }
  const shuffled = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const result = [...groups.entries()].map(([w, v]): KV => [w, v.reduce((s, n) => s + n, 0)]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { splits, mapOutput, combined, keys: groups.size, sample, shuffled: shuffled.slice(0, top).map(([w, v]) => [w, v.slice(0, 6)]), result: result.slice(0, top) };
}

// ---------- Exp 6: Bloom filter ----------
export const asciiSum = (word: string) => [...word].reduce((s, ch) => s + ch.charCodeAt(0), 0);
/** Lab hash family: h1 = roll*e, h2 = (2*roll-1)*e, h3.. = (2*roll-1+i)*e  (all mod m). */
export const hashes = (word: string, roll: number, m: number, k: number) => {
  const e = asciiSum(word);
  return Array.from({ length: k }, (_, i) => ((i === 0 ? roll : 2 * roll - 1 + (i - 1)) * e) % m);
};
/** Production-style hashing: two FNV-1a hashes combined by double hashing, h_i = h1 + i*h2 (mod m). */
const fnv = (word: string, seed: number) => { let h = (0x811c9dc5 ^ seed) >>> 0; for (const ch of word) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0; return h; };
export const strongHashes = (word: string, m: number, k: number) => { const a = fnv(word, 0), b = fnv(word, 0x9e3779b9) | 1; return Array.from({ length: k }, (_, i) => (a + i * b) % m); };
export class Bloom {
  bits: boolean[];
  constructor(public m: number, public roll: number, public k: number, public strong = false) { this.bits = Array(m).fill(false); }
  private idx(word: string) { return this.strong ? strongHashes(word, this.m, this.k) : hashes(word, this.roll, this.m, this.k); }
  add(word: string) { this.idx(word).forEach(i => { this.bits[i] = true; }); }
  has(word: string) { return this.idx(word).every(i => this.bits[i]); }
  get fill() { return this.bits.filter(Boolean).length / this.m; }
}
export type BloomVerdict = 'True positive' | 'False positive' | 'Not present';
export function bloomTest(filter: Bloom, inserted: Set<string>, word: string): BloomVerdict {
  if (!filter.has(word)) return 'Not present';
  return inserted.has(word) ? 'True positive' : 'False positive';
}
/** Theoretical false-positive rate (1 - e^(-kn/m))^k */
export const theoreticalFp = (m: number, n: number, k: number) => Math.pow(1 - Math.exp(-k * n / m), k);

// ---------- Exp 7: Social network analysis ----------
export type Graph = { nodes: { id: string; degree: number; weight: number; community: number; x: number; y: number }[]; edges: { a: number; b: number; w: number }[]; histogram: { degree: number; nodes: number }[]; communities: number; posts: number };

/** Hashtag co-occurrence network: two hashtags are linked when they appear in the same post. */
export function hashtagNetwork(rows: Post[], maxNodes: number, layout: 'circle' | 'force'): Graph {
  const pair = new Map<string, number>(); const freq = new Map<string, number>(); let used = 0;
  rows.forEach(p => {
    const tags = [...new Set(p.text.toLowerCase().match(/#\w+/g) ?? [])].sort();
    tags.forEach(t => freq.set(t, (freq.get(t) ?? 0) + 1));
    if (tags.length < 2) return; used++;
    for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) { const key = `${tags[i]}|${tags[j]}`; pair.set(key, (pair.get(key) ?? 0) + 1); }
  });
  const deg = new Map<string, number>();
  pair.forEach((_, key) => key.split('|').forEach(t => deg.set(t, (deg.get(t) ?? 0) + 1)));
  const histMap = new Map<number, number>(); deg.forEach(d => histMap.set(d, (histMap.get(d) ?? 0) + 1));
  const histogram = [...histMap.entries()].map(([degree, nodes]) => ({ degree, nodes })).sort((a, b) => a.degree - b.degree);

  const top = [...deg.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, maxNodes).map(e => e[0]);
  const index = new Map(top.map((t, i) => [t, i]));
  const edges: Graph['edges'] = [];
  pair.forEach((w, key) => { const [x = '', y = ''] = key.split('|'); const a = index.get(x), b = index.get(y); if (a !== undefined && b !== undefined) edges.push({ a, b, w }); });
  const nodeDeg = top.map(() => 0); edges.forEach(e => { nodeDeg[e.a] = nodeDeg[e.a]! + 1; nodeDeg[e.b] = nodeDeg[e.b]! + 1; });

  // community detection: deterministic label propagation
  const adj = top.map((): [number, number][] => []); edges.forEach(e => { adj[e.a]!.push([e.b, e.w]); adj[e.b]!.push([e.a, e.w]); });
  let label = top.map((_, i) => i);
  for (let round = 0; round < 12; round++) {
    let changed = false;
    top.forEach((_, i) => {
      if (!adj[i]!.length) return;
      const tally = new Map<number, number>(); adj[i]!.forEach(([nb, w]) => tally.set(label[nb]!, (tally.get(label[nb]!) ?? 0) + w / Math.sqrt(nodeDeg[nb]! + 1)));
      const best = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
      if (best !== label[i]) { label[i] = best; changed = true; }
    });
    if (!changed) break;
  }
  const ids = [...new Set(label)].sort((a, b) => a - b); label = label.map(l => ids.indexOf(l));

  const pos = top.map((_, i) => { const t = (i / Math.max(top.length, 1)) * Math.PI * 2; return { x: 50 + 42 * Math.cos(t), y: 50 + 42 * Math.sin(t) }; });
  if (layout === 'force') {
    const n = top.length;
    pos.forEach((p, i) => { p.x = 50 + 30 * Math.cos(i * 2.399); p.y = 50 + 30 * Math.sin(i * 2.399) * (0.6 + (i % 5) / 10); });
    for (let it = 0; it < 140; it++) {
      const f = pos.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = pos[i]!.x - pos[j]!.x, dy = pos[i]!.y - pos[j]!.y; const d2 = Math.max(dx * dx + dy * dy, 1); const r = 18 / d2;
        f[i]!.x += dx * r; f[i]!.y += dy * r; f[j]!.x -= dx * r; f[j]!.y -= dy * r;
      }
      edges.forEach(e => { const dx = pos[e.b]!.x - pos[e.a]!.x, dy = pos[e.b]!.y - pos[e.a]!.y; f[e.a]!.x += dx * 0.02; f[e.a]!.y += dy * 0.02; f[e.b]!.x -= dx * 0.02; f[e.b]!.y -= dy * 0.02; });
      pos.forEach((p, i) => { p.x = Math.min(96, Math.max(4, p.x + Math.max(-2, Math.min(2, f[i]!.x + (50 - p.x) * 0.01)))); p.y = Math.min(96, Math.max(4, p.y + Math.max(-2, Math.min(2, f[i]!.y + (50 - p.y) * 0.01)))); });
    }
  }
  return {
    nodes: top.map((id, i) => ({ id, degree: nodeDeg[i]!, weight: freq.get(id) ?? 0, community: label[i]!, x: pos[i]!.x, y: pos[i]!.y })),
    edges, histogram, communities: ids.length, posts: used,
  };
}
