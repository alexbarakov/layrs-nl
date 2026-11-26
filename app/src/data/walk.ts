// Walk planner and street router, ported from the stand (viewer/walk.js, viewer/route.js).
// Stops: poi/<GM>.json [lon, lat, bag16, year, height, monument, q]. Streets: graph/<GM>.json (p09_walk_graph.py).
import { dataUrl } from './config';
import { municipalities, municipalityAt } from './places';
import type { Stop, Walk } from './store';

export type Interest = 'mon' | 'old' | 'eras' | 'tall';
const DETOUR = 1.3, MAX_STOPS = 15, MIN_GAP = 45;
export const PACE_KMH = 4.5, STOP_MIN = 2;

const R = 6371008.8, rad = (d: number) => (d * Math.PI) / 180;
export function dist(a: [number, number], b: [number, number]) {
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function bearing(a: [number, number], b: [number, number]) {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const poiCache = new Map<string, Promise<any[]>>();
const loadPoi = (code: string) => {
  if (!poiCache.has(code)) poiCache.set(code, fetch(dataUrl(`poi/${code}.json`)).then((r) => (r.ok ? r.json() : [])).catch(() => []));
  return poiCache.get(code)!;
};
const toStop = (r: any[], gm: string): Stop => ({ ll: [r[0], r[1]], id: r[2], y: r[3], h: r[4], m: r[5], q: r[6] || 0, gm });

async function candidates(center: [number, number], radius: number): Promise<Stop[]> {
  const codes = municipalities().filter((g) => {
    const [x0, y0, x1, y1] = g.bbox;
    return dist(center, [Math.min(Math.max(center[0], x0), x1), Math.min(Math.max(center[1], y0), y1)]) <= radius;
  }).map((g) => g.c);
  const out: Stop[] = [];
  for (const c of codes) for (const r of await loadPoi(c)) out.push(toStop(r, c));
  return out;
}
const ERA = (y: number) => (y < 1600 ? 0 : y < 1666 ? 1 : y < 1800 ? 2 : 3);
function score(c: Stop, want: Set<Interest>) {
  let s = 0;
  if (want.has('mon') && c.m) s += 3;
  if (want.has('old')) s += c.y < 1650 ? 2.5 : c.y < 1750 ? 1.5 : c.y < 1850 ? 0.5 : 0;
  if (want.has('tall') && c.h >= 25) s += 2;
  return s + (want.has('eras') ? 1 : 0);
}

/** Greedy insertion by value per metre on straight lines, then 2-opt. */
async function choose(origin: [number, number], km: number, loop: boolean, want: Set<Interest>) {
  const budget = (km * 1000) / DETOUR;
  const radius = loop ? budget / 2.2 : budget * 0.9;
  let cand = (await candidates(origin, radius)).filter((c) => dist(origin, c.ll) <= radius);
  cand.forEach((c) => (c.s = score(c, want)));
  cand = cand.filter((c) => c.s! > 0);
  const best = new Map<string, Stop>();
  for (const c of cand) {
    const k = Math.round(c.ll[0] * 1500) + ':' + Math.round(c.ll[1] * 2500);
    if (!best.has(k) || best.get(k)!.s! < c.s!) best.set(k, c);
  }
  cand = [...best.values()].sort((a, b) => b.s! - a.s!).slice(0, 500);
  const target = Math.min(MAX_STOPS, Math.max(4, Math.round(km * 5)));
  const gap = Math.min(250, Math.max(MIN_GAP, budget / (target * 1.6)));
  const pts: ([number, number] | Stop)[] = loop ? [origin, origin] : [origin];
  const ll = (p: [number, number] | Stop) => ('ll' in p ? p.ll : p);
  let len = 0;
  const used = new Set<Stop>(), eras = new Set<number>();
  while (pts.length - (loop ? 2 : 1) < target) {
    let pick: { c: Stop; i: number; d: number; ratio: number } | null = null;
    for (const c of cand) {
      if (used.has(c) || pts.some((p) => p !== origin && dist(ll(p), c.ll) < gap)) continue;
      let bestD = Infinity, bestI = -1;
      for (let i = 0; i < pts.length - (loop ? 1 : 0); i++) {
        const a = ll(pts[i]), b = pts[i + 1] ? ll(pts[i + 1]) : null;
        const d = b ? dist(a, c.ll) + dist(c.ll, b) - dist(a, b) : dist(a, c.ll);
        if (d < bestD) { bestD = d; bestI = i + 1; }
      }
      if (len + bestD > budget) continue;
      const v = c.s! + (want.has('eras') && !eras.has(ERA(c.y)) ? 2 : 0);
      const ratio = v / (bestD + 60);
      if (!pick || ratio > pick.ratio) pick = { c, i: bestI, d: bestD, ratio };
    }
    if (!pick) break;
    pts.splice(pick.i, 0, pick.c); used.add(pick.c); eras.add(ERA(pick.c.y)); len += pick.d;
  }
  return { stops: pts.filter((p): p is Stop => 'll' in p), len, pool: cand.length };
}

// ---- street router on the municipality graph ----
interface Graph { N: number; lon: Float64Array; lat: Float64Array; start: Int32Array; to: Int32Array; via: Int32Array; e: number[]; g: number[] }
const graphCache = new Map<string, Promise<Graph | null>>();
function parse(j: { n: number[]; e: number[]; g: number[] }): Graph {
  const N = j.n.length / 2, E = j.e.length / 5;
  const lon = new Float64Array(N), lat = new Float64Array(N);
  for (let i = 0; i < N; i++) { lon[i] = j.n[2 * i] / 1e5; lat[i] = j.n[2 * i + 1] / 1e5; }
  const deg = new Int32Array(N + 1);
  for (let k = 0; k < E; k++) { deg[j.e[5 * k] + 1]++; deg[j.e[5 * k + 1] + 1]++; }
  for (let i = 0; i < N; i++) deg[i + 1] += deg[i];
  const fill = deg.slice(0, N), to = new Int32Array(2 * E), via = new Int32Array(2 * E);
  for (let k = 0; k < E; k++) {
    const u = j.e[5 * k], v = j.e[5 * k + 1];
    to[fill[u]] = v; via[fill[u]++] = k; to[fill[v]] = u; via[fill[v]++] = k;
  }
  return { N, lon, lat, start: deg, to, via, e: j.e, g: j.g };
}
const loadGraph = (code: string) => {
  if (!graphCache.has(code)) graphCache.set(code, fetch(dataUrl(`graph/${code}.json`)).then((r) => (r.ok ? r.json() : null)).then((j) => j && parse(j)).catch(() => null));
  return graphCache.get(code)!;
};
function snap(G: Graph, p: [number, number]) {
  let best = -1, bd = Infinity;
  const k = Math.cos(rad(p[1]));
  for (let i = 0; i < G.N; i++) {
    const dx = (G.lon[i] - p[0]) * k, dy = G.lat[i] - p[1], d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = i; }
  }
  return { node: best, d: best < 0 ? Infinity : dist(p, [G.lon[best], G.lat[best]]) };
}
function dijkstra(G: Graph, src: number, targets: number[]) {
  const dst = new Float64Array(G.N).fill(Infinity), prev = new Int32Array(G.N).fill(-1), done = new Uint8Array(G.N);
  const hn: number[] = [], hd: number[] = [];
  const push = (n: number, d: number) => {
    hn.push(n); hd.push(d); let i = hn.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (hd[p] <= hd[i]) break; [hn[p], hn[i]] = [hn[i], hn[p]]; [hd[p], hd[i]] = [hd[i], hd[p]]; i = p; }
  };
  const pop = (): [number, number] => {
    const n = hn[0], d = hd[0], ln = hn.pop()!, ld = hd.pop()!;
    if (hn.length) {
      hn[0] = ln; hd[0] = ld; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < hn.length && hd[l] < hd[m]) m = l;
        if (r < hn.length && hd[r] < hd[m]) m = r;
        if (m === i) break;
        [hn[m], hn[i]] = [hn[i], hn[m]]; [hd[m], hd[i]] = [hd[i], hd[m]]; i = m;
      }
    }
    return [n, d];
  };
  const want = new Set(targets); let left = want.size;
  dst[src] = 0; push(src, 0);
  while (hn.length && left) {
    const [u, d] = pop(); if (done[u]) continue; done[u] = 1;
    if (want.has(u)) left--;
    for (let a = G.start[u]; a < G.start[u + 1]; a++) {
      const v = G.to[a], k = G.via[a], nd = d + G.e[5 * k + 2];
      if (nd < dst[v]) { dst[v] = nd; prev[v] = a; push(v, nd); }
    }
  }
  return { dist: dst, prev };
}
function trace(G: Graph, run: { prev: Int32Array }, src: number, dst: number) {
  const arcs: number[] = [];
  for (let n = dst; n !== src;) {
    const a = run.prev[n]; if (a < 0) return null;
    arcs.push(a); const k = G.via[a]; n = G.e[5 * k] === n ? G.e[5 * k + 1] : G.e[5 * k];
  }
  arcs.reverse();
  const out: [number, number][] = [[G.lon[src], G.lat[src]]];
  let at = src;
  for (const a of arcs) {
    const k = G.via[a], u = G.e[5 * k], gs = G.e[5 * k + 3], gc = G.e[5 * k + 4], next = G.to[a];
    const mid: [number, number][] = [];
    for (let i = 0; i < gc; i++) mid.push([G.g[2 * (gs + i)] / 1e5, G.g[2 * (gs + i) + 1] / 1e5]);
    if (at !== u) mid.reverse();
    out.push(...mid, [G.lon[next], G.lat[next]]); at = next;
  }
  return out;
}
const tourLen = (D: number[][], o: number[], loop: boolean) =>
  o.slice(1).reduce((s, x, i) => s + D[o[i]][x], 0) + (loop ? D[o[o.length - 1]][o[0]] : 0);
function twoOpt(D: number[][], ord: number[], loop: boolean) {
  let improved = true, guard = 0;
  while (improved && guard++ < 100) {
    improved = false;
    for (let i = 1; i < ord.length - 1; i++) for (let k = i + 1; k < ord.length; k++) {
      const t = ord.slice(0, i).concat(ord.slice(i, k + 1).reverse(), ord.slice(k + 1));
      if (tourLen(D, t, loop) < tourLen(D, ord, loop) - 1) { ord = t; improved = true; }
    }
  }
  return ord;
}
async function route(origin: [number, number], stops: Stop[], loop: boolean, maxLen: number, keepOrder: boolean) {
  const code = municipalityAt(origin[0], origin[1])?.code;
  const G = code ? await loadGraph(code) : null;
  if (!G) return null;
  const pts = [{ ll: origin, s: Infinity } as Stop, ...stops];
  const sn = pts.map((p) => snap(G, p.ll));
  if (sn[0].d > 300) return null;
  const keep = pts.map((_, i) => i === 0 || sn[i].d <= 150);
  const P = pts.filter((_, i) => keep[i]), S = sn.filter((_, i) => keep[i]);
  const nodes = S.map((x) => x.node), runs = nodes.map((n) => dijkstra(G, n, nodes));
  const D = P.map((_, i) => P.map((_, j) => (i === j ? 0 : runs[i].dist[nodes[j]] / 10 + S[i].d + S[j].d)));
  let ord = P.map((_, i) => i);
  if (!keepOrder) {
    ord = twoOpt(D, ord, loop);
    while (ord.length > 4 && tourLen(D, ord, loop) > maxLen) {
      let worst = -1, bestRatio = -1;
      for (let i = 1; i < ord.length; i++) {
        const t = ord.filter((_, j) => j !== i), save = tourLen(D, ord, loop) - tourLen(D, t, loop);
        const r = save / ((P[ord[i]].s || 1) + 0.5);
        if (r > bestRatio) { bestRatio = r; worst = i; }
      }
      ord.splice(worst, 1); ord = twoOpt(D, ord, loop);
    }
  }
  const seq = loop ? [...ord, 0] : ord;
  const path: [number, number][] = [origin], legs: number[] = [];
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i], b = seq[i + 1];
    const part = trace(G, runs[a], nodes[a], nodes[b]);
    if (part) path.push(...part);
    path.push(P[b].ll); legs.push(D[a][b]);
  }
  return { stops: ord.slice(1).map((i) => P[i]), legs, len: legs.reduce((a, b) => a + b, 0), path };
}

export async function planWalk(origin: [number, number], km: number, loop: boolean, want: Set<Interest>): Promise<Walk> {
  const c = await choose(origin, km, loop, want);
  const w: Walk = { origin, stops: c.stops, loop, km, len: c.len, legs: null, path: null, routed: false };
  if (!c.stops.length) return w;
  const r = await route(origin, c.stops, loop, km * 1000 * 1.1, false);
  if (r && r.stops.length) Object.assign(w, { stops: r.stops, len: r.len, legs: r.legs, path: r.path, routed: true });
  return w;
}
export const walkMeters = (w: Walk) => (w.routed ? w.len : w.len * DETOUR);
export const walkMinutes = (w: Walk) => Math.round((walkMeters(w) / 1000 / PACE_KMH) * 60 + w.stops.length * STOP_MIN);
export const legMeters = (w: Walk, i: number) =>
  w.legs ? w.legs[i] : dist(i ? w.stops[i - 1].ll : w.origin, w.stops[i].ll) * DETOUR;
