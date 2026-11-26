// Walking router on the per-municipality pedestrian graph (graph/<GMcode>.json, built by p09_walk_graph.py).
// solve(): snap points to the graph, real distance matrix by Dijkstra, 2-opt on that matrix,
// drop the least valuable stops while the walk is longer than asked, then trace the path along the streets.
window.Router = (() => {
  const cache = new Map();
  const R = 6371008.8, rad = d => d * Math.PI / 180;
  const hav = (a, b) => { const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

  function parse(j) {
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
  function load(code) {
    if (!cache.has(code)) cache.set(code, fetch(`graph/${code}.json`).then(r => r.ok ? r.json() : null).then(j => j && parse(j)).catch(() => null));
    return cache.get(code);
  }
  function snap(G, p) {
    let best = -1, bd = Infinity;
    const k = Math.cos(rad(p[1]));
    for (let i = 0; i < G.N; i++) {
      const dx = (G.lon[i] - p[0]) * k, dy = G.lat[i] - p[1], d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return { node: best, d: best < 0 ? Infinity : hav(p, [G.lon[best], G.lat[best]]) };
  }
  // Dijkstra from one node until every target is settled; distances in decimetres
  function dijkstra(G, src, targets) {
    const dist = new Float64Array(G.N).fill(Infinity), prev = new Int32Array(G.N).fill(-1), done = new Uint8Array(G.N);
    const hn = [], hd = [];
    const push = (n, d) => { hn.push(n); hd.push(d); let i = hn.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (hd[p] <= hd[i]) break; [hn[p], hn[i]] = [hn[i], hn[p]]; [hd[p], hd[i]] = [hd[i], hd[p]]; i = p; } };
    const pop = () => { const n = hn[0], d = hd[0], ln = hn.pop(), ld = hd.pop();
      if (hn.length) { hn[0] = ln; hd[0] = ld; let i = 0;
        for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < hn.length && hd[l] < hd[m]) m = l; if (r < hn.length && hd[r] < hd[m]) m = r;
          if (m === i) break; [hn[m], hn[i]] = [hn[i], hn[m]]; [hd[m], hd[i]] = [hd[i], hd[m]]; i = m; } }
      return [n, d]; };
    const want = new Set(targets); let left = want.size;
    dist[src] = 0; push(src, 0);
    while (hn.length && left) {
      const [u, d] = pop(); if (done[u]) continue; done[u] = 1;
      if (want.has(u)) left--;
      for (let a = G.start[u]; a < G.start[u + 1]; a++) {
        const v = G.to[a], k = G.via[a], nd = d + G.e[5 * k + 2];
        if (nd < dist[v]) { dist[v] = nd; prev[v] = a; push(v, nd); }
      }
    }
    return { dist, prev };
  }
  function trace(G, run, src, dst) {
    const arcs = [];
    for (let n = dst; n !== src; ) { const a = run.prev[n]; if (a < 0) return null; arcs.push(a); const k = G.via[a]; n = G.e[5 * k] === n ? G.e[5 * k + 1] : G.e[5 * k]; }
    arcs.reverse();
    const out = [[G.lon[src], G.lat[src]]];
    let at = src;
    for (const a of arcs) {
      const k = G.via[a], u = G.e[5 * k], gs = G.e[5 * k + 3], gc = G.e[5 * k + 4], next = G.to[a];
      const mid = []; for (let i = 0; i < gc; i++) mid.push([G.g[2 * (gs + i)] / 1e5, G.g[2 * (gs + i) + 1] / 1e5]);
      if (at !== u) mid.reverse();
      out.push(...mid, [G.lon[next], G.lat[next]]); at = next;
    }
    return out;
  }
  const tourLen = (D, ord, loop) => ord.slice(1).reduce((s, x, i) => s + D[ord[i]][x], 0) + (loop ? D[ord[ord.length - 1]][ord[0]] : 0);
  function twoOpt(D, ord, loop) {
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

  // points: origin + stops [{ll, s}], returns null when there is no graph here
  async function solve(code, origin, stops, { loop, maxLen, keepOrder }) {
    const G = code && await load(code); if (!G) return null;
    const pts = [{ ll: origin, s: Infinity }, ...stops];
    const sn = pts.map(p => snap(G, p.ll));
    const ok = pts.map((p, i) => i === 0 || sn[i].d <= 150);
    if (sn[0].d > 300) return null;
    const P = pts.filter((_, i) => ok[i]), S = sn.filter((_, i) => ok[i]);
    const nodes = S.map(x => x.node), runs = nodes.map(n => dijkstra(G, n, nodes));
    const D = P.map((_, i) => P.map((_, j) => i === j ? 0 : runs[i].dist[nodes[j]] / 10 + S[i].d + S[j].d));
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
    const seq = loop ? [...ord, 0] : ord, path = [origin], legs = [];
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i], b = seq[i + 1];
      const part = trace(G, runs[a], nodes[a], nodes[b]);
      if (part) path.push(...part); path.push(P[b].ll);
      legs.push(D[a][b]);
    }
    return { stops: ord.slice(1).map(i => P[i]), legs, len: legs.reduce((a, b) => a + b, 0), path, dropped: stops.length - (ord.length - 1) };
  }
  return { solve, load };
})();
