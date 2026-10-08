import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { posts, summary } from '@/data/analysis';
import { Bloom, bloomTest, hashes, asciiSum, hashtagNetwork, theoreticalFp, wordCount, tokenize } from '@/lib/bigdata';

const n = (v: number) => v.toLocaleString('en-US');
const palette = ['var(--primary)', 'var(--positive)', 'var(--negative)', 'var(--neutral)', 'var(--cyan)'];
const titles: Record<string, [string, string, string]> = {
  mapreduce: ['MapReduce word count', 'Experiment 4 · Map, shuffle and reduce over the whole TweetEval corpus.', 'EXP 04 · MAPREDUCE'],
  bloom: ['Bloom filter', 'Experiment 6 · Probabilistic membership testing with ASCII-sum hash functions.', 'EXP 06 · STREAM ALGORITHMS'],
  network: ['Social network analysis', 'Experiment 7 · Hashtag co-occurrence graph, degree distribution and communities.', 'EXP 07 · GRAPH ANALYTICS'],
};
const Stat = ({ label, value, foot }: { label: string; value: string; foot: string }) => <div className="metric"><div className="metric-top">{label}</div><div className="metric-value">{value}</div><div className="metric-foot">{foot}</div></div>;
const Phase = ({ step, title, children }: { step: string; title: string; children: React.ReactNode }) => <section className="panel"><div className="panel-head"><div><h2>{title}</h2><p className="font-mono">{step}</p></div></div><div className="p-4 text-xs">{children}</div></section>;

function MapReduce() {
  const [mappers, setMappers] = useState(4); const [combiner, setCombiner] = useState(true);
  const run = useMemo(() => wordCount(posts, mappers, combiner), [mappers, combiner]);
  const max = run.result[0]?.[1] ?? 1;
  return <>
    <div className="flex gap-4 items-center mb-6 flex-wrap">
      <label className="text-xs flex items-center gap-3">Mappers (input splits)<input type="range" min={1} max={12} value={mappers} onChange={e => setMappers(+e.target.value)} aria-label="Number of mappers"/><b className="text-primary">{mappers}</b></label>
      <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={combiner} onChange={e => setCombiner(e.target.checked)}/>Combiner (local pre-aggregation)</label>
    </div>
    <div className="metrics">
      <Stat label="Input records" value={n(posts.length)} foot={`${mappers} splits of ~${n(Math.ceil(posts.length / mappers))} posts`}/>
      <Stat label="Map output pairs" value={n(run.mapOutput)} foot="(word, 1) emitted by mappers"/>
      <Stat label="Shuffled pairs" value={n(run.combined)} foot={combiner ? `${(100 - run.combined / run.mapOutput * 100).toFixed(0)}% less network traffic via combiner` : 'No combiner: every pair is shuffled'}/>
      <Stat label="Unique words (keys)" value={n(run.keys)} foot="Reducer groups"/>
    </div>
    <div className="charts-grid">
      <Phase step="1 · MAP" title="Mapper output"><p className="text-muted-foreground mb-3">Each mapper tokenizes its split and emits a <code>(word, 1)</code> pair.</p>
        <div className="flex flex-wrap gap-2 mb-4">{run.sample.map(([w], i) => <span key={i} className="sentiment-pill neutral">({w}, 1)</span>)}</div>
        <table className="trend-table"><thead><tr><th>MAPPER</th><th>POSTS</th><th>PAIRS EMITTED</th></tr></thead><tbody>{run.splits.map(s => <tr key={s.index}><td>Mapper {s.index}</td><td>{n(s.records)}</td><td>{n(s.pairs)}</td></tr>)}</tbody></table></Phase>
      <Phase step="2 · SHUFFLE & SORT" title="Grouped by key"><p className="text-muted-foreground mb-3">Pairs are partitioned so every occurrence of a word reaches one reducer.</p>
        {run.shuffled.slice(0, 8).map(([w, v]) => <div key={w} className="flex justify-between gap-3 py-1 border-t border-border font-mono"><span>{w}</span><span className="text-muted-foreground truncate">[{v.join(', ')}{v.length >= 6 ? ', …' : ''}]</span></div>)}</Phase>
    </div>
    <Phase step="3 · REDUCE" title="Top 15 words — reducer output"><p className="text-muted-foreground mb-3">The reducer sums each list: <code>(word, [1,1,2,…]) → (word, total)</code>.</p>
      {run.result.map(([w, c]) => <div key={w} className="flex items-center gap-3 py-1"><span className="w-28 font-mono">{w}</span><div className="flex-1 h-2 bg-secondary rounded"><div className="h-2 rounded bg-primary" style={{ width: `${c / max * 100}%` }}/></div><span className="w-12 text-right font-mono">{n(c)}</span></div>)}</Phase>
  </>;
}

function BloomLab() {
  const tags = summary.tags;
  const [roll, setRoll] = useState(7); const [m, setM] = useState(11); const [k, setK] = useState(2);
  const [inserted, setInserted] = useState('python, spark, hadoop, hive, bigdata, mongodb, cloud, data, tweet, stream');
  const [tested, setTested] = useState('spark, java, data, kafka, hbase');
  const words = (s: string) => s.split(/[\s,]+/).map(w => w.toLowerCase().replace(/^#/, '')).filter(Boolean);
  const lab = useMemo(() => {
    const set = new Set(words(inserted)); const f = new Bloom(m, roll, k); set.forEach(w => f.add(w));
    return { f, set, rows: words(tested).map(w => ({ w, ascii: asciiSum(w), idx: hashes(w, roll, m, k), verdict: bloomTest(f, set, w) })) };
  }, [inserted, tested, roll, m, k]);
  const [bigM, setBigM] = useState(16384);
  const scale = useMemo(() => {
    const members = new Set(tags.map(t => t.name.slice(1))); const f = new Bloom(bigM, 31, 3, true), weak = new Bloom(bigM, 31, 3); members.forEach(w => { f.add(w); weak.add(w); });
    const probes = [...new Set(posts.flatMap(p => tokenize(p.text)).filter(w => !w.startsWith('#') && !members.has(w)))];
    const fp = probes.filter(w => f.has(w)).length;
    return { members: members.size, probes: probes.length, fp, f, weakFp: probes.filter(w => weak.has(w)).length };
  }, [bigM, tags]);
  const verdictClass = (v: string) => v === 'True positive' ? 'positive' : v === 'False positive' ? 'negative' : 'neutral';
  return <>
    <div className="charts-grid">
      <section className="panel"><div className="panel-head"><div><h2>Lab setup</h2><p>Filter of m bits · hashes h(e) = (roll × ASCII sum) mod m</p></div></div><div className="p-4 grid gap-4 text-xs">
        <div className="flex gap-6 flex-wrap">
          <label>Roll no.<input className="filter-select ml-2 w-20" type="number" min={1} value={roll} onChange={e => setRoll(Math.max(1, +e.target.value || 1))}/></label>
          <label>Filter size m<input className="filter-select ml-2 w-20" type="number" min={2} max={64} value={m} onChange={e => setM(Math.min(64, Math.max(2, +e.target.value || 11)))}/></label>
          <label>Hash functions k<select className="filter-select ml-2" value={k} onChange={e => setK(+e.target.value)}>{[1, 2, 3].map(v => <option key={v}>{v}</option>)}</select></label>
        </div>
        <label>Words to insert (10)<input className="full-search mt-1" value={inserted} onChange={e => setInserted(e.target.value)} aria-label="Words to insert"/></label>
        <label>Words to test (5)<input className="full-search mt-1" value={tested} onChange={e => setTested(e.target.value)} aria-label="Words to test"/></label>
        <p className="text-muted-foreground">h1 = roll × e, h2 = (2·roll − 1) × e{k > 2 ? ', h3 = (2·roll) × e' : ''} (all mod {m}).</p>
      </div></section>
      <section className="panel"><div className="panel-head"><div><h2>Bit array</h2><p>{lab.f.bits.filter(Boolean).length} of {m} bits set · {(lab.f.fill * 100).toFixed(0)}% full</p></div></div>
        <div className="p-4 flex flex-wrap gap-1.5">{lab.f.bits.map((b, i) => <div key={i} className="text-center font-mono text-[10px]"><div className={`w-8 h-8 grid place-items-center rounded border ${b ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>{b ? 1 : 0}</div><span className="text-muted-foreground">{i}</span></div>)}</div></section>
    </div>
    <section className="panel mb-5"><div className="panel-head"><div><h2>Membership test results</h2><p>Present in filter but never inserted = false positive</p></div></div>
      <div className="table-scroll"><table className="trend-table"><thead><tr><th>WORD</th><th>ASCII SUM</th><th>HASHED BITS</th><th>RESULT</th></tr></thead><tbody>{lab.rows.map(r => <tr key={r.w}><td>{r.w}</td><td>{r.ascii}</td><td>{r.idx.join(', ')}</td><td><span className={`sentiment-pill ${verdictClass(r.verdict)}`}>{r.verdict}</span></td></tr>)}</tbody></table></div></section>
    <section className="panel"><div className="panel-head"><div><h2>At big-data scale</h2><p>All {n(scale.members)} dataset hashtags in one filter, tested against {n(scale.probes)} ordinary words</p></div>
      <label className="text-xs flex items-center gap-3">m = {n(bigM)} bits<input type="range" min={2048} max={65536} step={2048} value={bigM} onChange={e => setBigM(+e.target.value)} aria-label="Large filter size"/></label></div>
      <div className="metrics p-4"><Stat label="Memory" value={`${(bigM / 8 / 1024).toFixed(1)} KB`} foot="vs storing every hashtag string"/><Stat label="Measured false positives" value={`${(scale.fp / scale.probes * 100).toFixed(1)}%`} foot={`${n(scale.fp)} of ${n(scale.probes)} non-members · FNV-1a double hashing`}/><Stat label="Theoretical rate" value={`${(theoreticalFp(bigM, scale.members, 3) * 100).toFixed(1)}%`} foot="(1 − e^(−kn/m))^k, k = 3"/><Stat label="ASCII-sum hash (lab)" value={`${(scale.weakFp / scale.probes * 100).toFixed(0)}%`} foot="Same size, weak hash: sums collide, so the filter fails at scale"/></div></section>
  </>;
}

function Network() {
  const [layout, setLayout] = useState<'circle' | 'force'>('force'); const [count, setCount] = useState(40); const [sel, setSel] = useState<string | null>(null);
  const g = useMemo(() => hashtagNetwork(posts, count, layout), [count, layout]);
  const maxDeg = Math.max(...g.nodes.map(x => x.degree), 1);
  const active = g.nodes.find(x => x.id === sel); const neighbours = new Set(active ? g.edges.filter(e => g.nodes[e.a]!.id === sel || g.nodes[e.b]!.id === sel).flatMap(e => [g.nodes[e.a]!.id, g.nodes[e.b]!.id]) : []);
  const hubs = [...g.nodes].sort((a, b) => b.degree - a.degree).slice(0, 5);
  return <>
    <div className="metrics">
      <Stat label="Posts with ≥ 2 hashtags" value={n(g.posts)} foot="Create network: one edge per co-occurrence"/>
      <Stat label="Nodes shown" value={n(g.nodes.length)} foot="Highest-degree hashtags"/>
      <Stat label="Edges shown" value={n(g.edges.length)} foot="Weighted by co-mentions"/>
      <Stat label="Communities" value={n(g.communities)} foot="Label propagation"/>
    </div>
    <div className="flex gap-4 items-center mb-5 flex-wrap text-xs">
      <label className="flex items-center gap-3">Nodes<input type="range" min={10} max={80} step={5} value={count} onChange={e => setCount(+e.target.value)} aria-label="Number of nodes"/><b className="text-primary">{count}</b></label>
      <select className="filter-select" aria-label="Graph layout" value={layout} onChange={e => setLayout(e.target.value as 'circle' | 'force')}><option value="force">Force-directed layout</option><option value="circle">Circular layout</option></select>
      <span className="text-muted-foreground">Node size = degree · colour = community · click a node to highlight its neighbours</span>
    </div>
    <div className="charts-grid">
      <section className="panel"><div className="panel-head"><div><h2>Network diagram</h2><p>{active ? `${active.id} · degree ${active.degree} · ${active.weight} posts` : 'Hashtag co-occurrence graph'}</p></div></div>
        <svg viewBox="0 0 100 100" className="w-full" style={{ height: 460 }} role="img" aria-label="Hashtag network diagram">
          {g.edges.map((e, i) => { const a = g.nodes[e.a]!, b = g.nodes[e.b]!; const on = !sel || a.id === sel || b.id === sel; return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--muted-foreground)" strokeWidth={0.15 + Math.min(e.w, 5) * 0.08} opacity={on ? 0.45 : 0.06}/>; })}
          {g.nodes.map(v => { const on = !sel || v.id === sel || neighbours.has(v.id); return <g key={v.id} onClick={() => setSel(sel === v.id ? null : v.id)} style={{ cursor: 'pointer' }} opacity={on ? 1 : 0.2}><circle cx={v.x} cy={v.y} r={0.9 + v.degree / maxDeg * 2.6} fill={palette[v.community % palette.length]}/>{(v.degree >= maxDeg * 0.35 || v.id === sel) && <text x={v.x} y={v.y - 3.4} fontSize="2.2" textAnchor="middle" fill="var(--foreground)">{v.id}</text>}</g>; })}
        </svg></section>
      <section className="panel"><div className="panel-head"><div><h2>Degree distribution</h2><p>Histogram of node degree · whole network</p></div></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={g.histogram.slice(0, 15)} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="degree" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} label={{ value: 'degree', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--muted-foreground)' }}/><YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}/><Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11 }}/><Bar dataKey="nodes" fill="var(--primary)"/></BarChart></ResponsiveContainer></div>
        <div className="p-4 text-xs border-t border-border"><b>Top hubs</b>{hubs.map(h => <div key={h.id} className="flex justify-between py-1"><span className="font-mono">{h.id}</span><span className="text-muted-foreground">degree {h.degree}</span></div>)}</div></section>
    </div>
  </>;
}

export function BigDataLab({ view }: { view: 'mapreduce' | 'bloom' | 'network' }) {
  const [title, subtitle, tag] = titles[view]!;
  return <main className="page"><div className="page-heading"><div><div className="eyebrow">{tag}</div><h1 className="glitch">{title}<span className="text-primary">.</span></h1><p>{subtitle}</p></div></div>
    {view === 'mapreduce' && <MapReduce/>}{view === 'bloom' && <BloomLab/>}{view === 'network' && <Network/>}
    <div className="provenance mt-6 border-t border-border flex items-center gap-2"><ArrowRight size={12}/>Computed in your browser from the bundled TweetEval corpus ({n(posts.length)} posts) — a single-node simulation of the distributed algorithm.</div>
  </main>;
}
