// LAYRS NL stand: geolocation and walk planner.
// Uses globals from m.html: map, $, showCard, period2, GEM, gemAt, sheetH.
// Stops come from poi/<GMcode>.json: [lon, lat, bag16, year, height, monument].
// Legs are straight lines; walking length is estimated as straight * DETOUR until on-device routing lands.

(() => {
const DETOUR = 1.3, PACE = 4.5, STOP_MIN = 2, ARRIVE_M = 25, MAX_STOPS = 15, MIN_GAP = 45;
const W = { state: 'off', start: 'me', km: 2, loop: true, want: new Set(['mon', 'old']),
            stops: [], origin: null, next: 0, built: null };
const poiCache = new Map();

// ---------- geometry helpers (local metres around a reference point) ----------
const R = 6371008.8, rad = d => d * Math.PI / 180;
function dist(a, b) {               // haversine, metres; a/b = [lon, lat]
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function bearing(a, b) {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
const KM = new Intl.NumberFormat('ru', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtM = m => m < 1000 ? `${Math.round(m / 10) * 10}\u00A0м` : `${KM.format(m / 1000)}\u00A0км`;
// toast with an optional action button (used for undo)
function toast(t, ms = 4000, action) {
  const e = $('#toast'); e.textContent = t; e.hidden = false;
  if (action) { const b = document.createElement('button'); b.textContent = action.label; b.onclick = () => { e.hidden = true; action.fn(); }; e.appendChild(b); }
  clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, ms);
}

// ---------- geolocation ----------
const GEO = { pos: null, acc: null, watch: null, follow: false };
function locLayers() {
  if (map.getSource('me')) return;
  map.addSource('me', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'me-acc', type: 'circle', source: 'me', paint: { 'circle-color': '#1a73e8', 'circle-opacity': 0.12, 'circle-radius': 0, 'circle-pitch-alignment': 'map' } });
  map.addLayer({ id: 'me', type: 'circle', source: 'me', paint: { 'circle-color': '#1a73e8', 'circle-radius': 7, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3, 'circle-pitch-alignment': 'map' } });
}
function drawMe() {
  if (!GEO.pos || !map.getSource('me')) return;
  map.getSource('me').setData({ type: 'Feature', geometry: { type: 'Point', coordinates: GEO.pos } });
  // accuracy circle: metres -> pixels at each zoom (web mercator ground resolution)
  const m0 = 156543.03 * Math.cos(rad(GEO.pos[1]));
  map.setPaintProperty('me-acc', 'circle-radius', ['interpolate', ['exponential', 2], ['zoom'], 0, GEO.acc / m0, 22, GEO.acc / m0 * 2 ** 22]);
}
function startGeo(then) {
  if (!window.isSecureContext) { toast('Геопозиция работает только по https. Откройте стенд на порту 8661.', 6000); $('#locate').classList.add('off'); return; }
  if (!navigator.geolocation) { toast('Браузер не даёт геопозицию'); return; }
  if (GEO.watch !== null) { then && GEO.pos && then(GEO.pos); return; }
  let first = true;
  GEO.watch = navigator.geolocation.watchPosition(p => {
    GEO.pos = [p.coords.longitude, p.coords.latitude]; GEO.acc = p.coords.accuracy;
    drawMe();
    if (first) { first = false; then && then(GEO.pos); }
    if (GEO.follow) map.easeTo({ center: GEO.pos, duration: dur(600) });
    onMove();
  }, err => {
    GEO.watch = null;
    toast(err.code === 1 ? 'Доступ к геопозиции запрещён. Разрешите его в настройках браузера для этого сайта.' : 'Не удалось определить место: ' + err.message, 6000);
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}
$('#locate').onclick = () => startGeo(pos => {
  GEO.follow = true; $('#locate').classList.add('follow');
  map.flyTo({ center: pos, zoom: Math.max(map.getZoom(), 16), duration: dur(1200) });
});
map.on('dragstart', () => { GEO.follow = false; $('#locate').classList.remove('follow'); });

// ---------- stop candidates ----------
async function loadPoi(center, radius) {
  const codes = GEM.filter(g => {
    const [x0, y0, x1, y1] = g.bbox, cx = Math.min(Math.max(center[0], x0), x1), cy = Math.min(Math.max(center[1], y0), y1);
    return dist(center, [cx, cy]) <= radius;
  }).map(g => g.c);
  const out = [];
  for (const c of codes) {
    if (!poiCache.has(c)) poiCache.set(c, fetch(`${DATA}/poi/${c}.json`).then(r => r.ok ? r.json() : []).catch(() => []));
    for (const r of await poiCache.get(c)) out.push({ ll: [r[0], r[1]], id: r[2], y: r[3], h: r[4], m: r[5], q: r[6] || 0, gm: c });
  }
  return out;
}
const ERA = y => y < 1600 ? 0 : y < 1666 ? 1 : y < 1800 ? 2 : 3;
function baseScore(c) {
  let s = 0;
  if (W.want.has('mon') && c.m) s += 3;
  if (W.want.has('old')) s += c.y < 1650 ? 2.5 : c.y < 1750 ? 1.5 : c.y < 1850 ? 0.5 : 0;
  if (W.want.has('tall') && c.h >= 25) s += 2;
  return s;
}

// ---------- planner: greedy insertion by value per metre, then 2-opt ----------
async function plan(origin) {
  const budget = W.km * 1000 / DETOUR;                       // straight-line metres we may spend
  const radius = W.loop ? budget / 2.2 : budget * 0.9;
  let cand = (await loadPoi(origin, radius)).filter(c => dist(origin, c.ll) <= radius);
  cand.forEach(c => c.s = baseScore(c) + (W.want.has('eras') ? 1 : 0));
  cand = cand.filter(c => c.s > 0);
  // one candidate per ~40 m cell: the best one, so a terrace of monuments does not eat all stops
  const best = new Map();
  for (const c of cand) {
    const k = Math.round(c.ll[0] * 1500) + ':' + Math.round(c.ll[1] * 2500);
    if (!best.has(k) || best.get(k).s < c.s) best.set(k, c);
  }
  cand = [...best.values()].sort((a, b) => b.s - a.s).slice(0, 500);
  if (!cand.length) return { stops: [], len: 0, pool: 0 };

  // spread stops over the requested length: about one per 200 m, never closer than `gap`
  const target = Math.min(MAX_STOPS, Math.max(4, Math.round(W.km * 5)));
  const gap = Math.min(250, Math.max(MIN_GAP, budget / (target * 1.6)));
  const route = W.loop ? [origin, origin] : [origin];
  let len = 0;
  const used = new Set(), eras = new Set();
  while (route.length - (W.loop ? 2 : 1) < target) {
    let pick = null;
    for (const c of cand) {
      if (used.has(c)) continue;
      if (route.some(p => p !== origin && dist(p.ll || p, c.ll) < gap)) continue;
      // cheapest insertion position
      let bestD = Infinity, bestI = -1;
      const n = route.length;
      for (let i = 0; i < n - (W.loop ? 1 : 0); i++) {
        const a = route[i].ll || route[i], b = route[i + 1] ? (route[i + 1].ll || route[i + 1]) : null;
        const d = b ? dist(a, c.ll) + dist(c.ll, b) - dist(a, b) : dist(a, c.ll);
        if (d < bestD) { bestD = d; bestI = i + 1; }
      }
      if (len + bestD > budget) continue;
      const v = c.s + (W.want.has('eras') && !eras.has(ERA(c.y)) ? 2 : 0);
      const ratio = v / (bestD + 60);
      if (!pick || ratio > pick.ratio) pick = { c, i: bestI, d: bestD, ratio };
    }
    if (!pick) break;
    route.splice(pick.i, 0, pick.c); used.add(pick.c); eras.add(ERA(pick.c.y)); len += pick.d;
  }
  // 2-opt on the stop order (start, and end for a loop, stay fixed)
  const P = route.map(p => p.ll || p);
  const L = () => P.slice(1).reduce((s, p, i) => s + dist(P[i], p), 0);
  let improved = true, guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    const last = W.loop ? P.length - 2 : P.length - 1;
    for (let i = 1; i < last; i++) for (let k = i + 1; k <= last; k++) {
      const a = P[i - 1], b = P[i], c = P[k], d = P[k + 1];
      const before = dist(a, b) + (d ? dist(c, d) : 0), after = dist(a, c) + (d ? dist(b, d) : 0);
      if (after < before - 1) {
        P.splice(i, k - i + 1, ...P.slice(i, k + 1).reverse());
        route.splice(i, k - i + 1, ...route.slice(i, k + 1).reverse());
        improved = true;
      }
    }
  }
  const stops = route.filter(p => p.ll);
  return { stops, len: L(), pool: cand.length };
}

// ---------- map layers for the route ----------
function walkLayers() {
  if (map.getSource('walk')) return;
  map.addSource('walk', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  const before = map.getLayer('road-label') ? 'road-label' : undefined;
  map.addLayer({ id: 'walk-line', type: 'line', source: 'walk', filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#8c1c13', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 17, 5], 'line-dasharray': [2, 1.5], 'line-opacity': 0.9 } }, before);
  map.addLayer({ id: 'walk-stop', type: 'circle', source: 'walk', filter: ['==', ['get', 'k'], 'stop'],
    paint: { 'circle-radius': 11, 'circle-color': ['case', ['get', 'done'], '#b9b4aa', '#8c1c13'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'walk-num', type: 'symbol', source: 'walk', filter: ['==', ['get', 'k'], 'stop'],
    layout: { 'text-field': ['to-string', ['get', 'n']], 'text-font': ['Open Sans Semibold'], 'text-size': 12, 'text-allow-overlap': true, 'icon-allow-overlap': true },
    paint: { 'text-color': '#fff' } });
  map.addLayer({ id: 'walk-start', type: 'circle', source: 'walk', filter: ['==', ['get', 'k'], 'start'],
    paint: { 'circle-radius': 6, 'circle-color': '#fff', 'circle-stroke-color': '#8c1c13', 'circle-stroke-width': 3 } });
  map.on('click', 'walk-stop', e => openStop(e.features[0].properties.n - 1));
}
function drawWalk() {
  walkLayers();
  const f = [];
  if (W.stops.length) {
    const line = W.path || [W.origin, ...W.stops.map(s => s.ll), ...(W.loop ? [W.origin] : [])];
    map.setPaintProperty('walk-line', 'line-dasharray', W.routed ? [1, 0] : [2, 1.5]);
    f.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } });
    W.stops.forEach((s, i) => f.push({ type: 'Feature', properties: { k: 'stop', n: i + 1, done: i < W.next && W.state === 'go' }, geometry: { type: 'Point', coordinates: s.ll } }));
    f.push({ type: 'Feature', properties: { k: 'start' }, geometry: { type: 'Point', coordinates: W.origin } });
  }
  map.getSource('walk').setData({ type: 'FeatureCollection', features: f });
}
function openStop(i) {
  const s = W.stops[i];
  map.flyTo({ center: s.ll, zoom: Math.max(map.getZoom(), 16.5), duration: dur(900) });
  showCard({ properties: { id: s.id, y: s.y, h: s.h, m: s.m, q: s.q } });
}

// ---------- panel ----------
const chip = (label, on, attrs = '') => `<button class="${on ? 'on' : ''}" aria-pressed="${on}" ${attrs}>${label}</button>`;
const group = (id, label, body) => `<div class="lbl" id="${id}">${label}</div><div class="wrapchips" role="group" aria-labelledby="${id}">${body}</div>`;
function render() {
  const p = $('#walk');
  if (W.state === 'setup') {
    p.innerHTML = `<h3>Прогулка</h3>
      ${group('w-from', 'Откуда', chip('Моё место', W.start === 'me', 'data-start="me"') + chip('Центр карты', W.start === 'center', 'data-start="center"'))}
      ${group('w-what', 'Что смотреть', chip('Памятники', W.want.has('mon'), 'data-want="mon"') + chip('Старые дома', W.want.has('old'), 'data-want="old"') + chip('Разные эпохи', W.want.has('eras'), 'data-want="eras"') + chip('Высотные', W.want.has('tall'), 'data-want="tall"'))}
      ${group('w-len', 'Длина пешком', [1, 2, 3, 5].map(k => chip(k + '\u00A0км', W.km === k, `data-km="${k}"`)).join(''))}
      ${group('w-shape', 'Форма', chip('Круг', W.loop, 'data-loop="1"') + chip('В одну сторону', !W.loop, 'data-loop="0"'))}
      <div class="act"><button class="primary" id="w-build">Построить</button><button id="w-close">Закрыть</button></div>`;
  } else if (W.state === 'result') {
    const walkM = W.routed ? W.len : W.len * DETOUR, min = Math.round(walkM / 1000 / PACE * 60 + W.stops.length * STOP_MIN);
    p.innerHTML = W.stops.length ? `<h3>Прогулка · ${W.stops.length} ${plural(W.stops.length, 'остановка', 'остановки', 'остановок')}</h3>
      <div class="sum">${W.routed ? '' : 'около '}${fmtM(walkM)} ${W.routed ? 'по улицам' : 'пешком, оценка по прямой'} · ${min} мин с остановками · ${W.loop ? 'круг' : 'в одну сторону'}</div>
      <ol>${W.stops.map((s, i) => `<li><button data-i="${i}"><span class="n" aria-hidden="true">${i + 1}</span><span><span class="vh">Остановка ${i + 1}: </span>${yearText(s)}${s.m ? ' · памятник\u00A0' + s.m : ''}</span><small>${fmtM(W.legs ? W.legs[i] : dist(i ? W.stops[i - 1].ll : W.origin, s.ll) * DETOUR)}</small></button></li>`).join('')}</ol>
      <div class="act"><button class="primary" id="w-go">Начать</button><a class="btnlink" id="w-gmaps" href="${gmaps(true)}" target="_blank" rel="noopener">Google Maps</a><button id="w-share">Ссылка</button><button id="w-edit">Изменить</button><button id="w-close">Закрыть</button></div>`
      : `<h3>Не из чего строить</h3><div class="sum">В этом радиусе нет зданий под выбранные интересы. Увеличьте длину, добавьте «Старые дома» или передвиньте старт.</div>
      <div class="act"><button class="primary" id="w-edit">Изменить</button><button id="w-close">Закрыть</button></div>`;
  } else if (W.state === 'go') {
    const s = W.stops[W.next];
    if (!s) {
      p.innerHTML = `<h3>Прогулка пройдена</h3><div class="sum">${W.stops.length} из ${W.stops.length} остановок.</div><div class="act"><button class="primary" id="w-close">Готово</button></div>`;
    } else {
      const here = GEO.pos, d = here ? dist(here, s.ll) : null, b = here ? bearing(here, s.ll) - map.getBearing() : 0;
      p.innerHTML = `<div class="lbl" style="margin-top:0">Остановка ${W.next + 1} из ${W.stops.length}</div>
        <div class="next"><span class="arrow" role="img" aria-label="${here ? 'Направление к остановке' : 'Направление неизвестно'}" style="transform:rotate(${b}deg)">${here ? '↑' : '•'}</span>
          <div><h3 style="margin:0">${yearText(s)}${s.m ? ' · памятник' : ''}</h3>
          <div class="sum" id="w-dist" style="margin:2px 0 0">${here ? fmtM(d) + ' по прямой' : 'Геопозиция выключена: переходите по кнопке «Дальше»'}</div></div></div>
        <div class="act"><button class="primary" id="w-next">${here ? 'Я на месте' : 'Дальше'}</button><button id="w-card">О здании</button><button id="w-stop">Закончить</button></div>`;
    }
  }
  p.hidden = W.state === 'off'; $('#sheet').hidden = W.state !== 'off';
  $('#cross').hidden = !(W.state === 'setup' && W.start === 'center');
  sheetH();
}
const yearText = s => s.y > 0 ? (s.q === 1 || s.q === 2 || s.q === 4 ? 'около ' + s.y : String(s.y)) : 'год неизвестен';
const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c;

$('#walk').addEventListener('click', async e => {
  if (e.target.closest('#w-gmaps')) { if (W.stops.length > (W.loop ? 9 : 10)) toast('Google Maps принимает до 9 промежуточных точек: в ссылке первые 9.'); return; }
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.start) { W.start = d.start; if (d.start === 'me') startGeo(); }
  else if (d.want) { W.want.has(d.want) ? W.want.delete(d.want) : W.want.add(d.want); if (!W.want.size) W.want.add('mon'); }
  else if (d.km) W.km = +d.km;
  else if (d.loop) W.loop = d.loop === '1';
  else if (d.i !== undefined) return openStop(+d.i);
  else if (t.id === 'w-build') return build();
  else if (t.id === 'w-close') {
    const kept = W.state === 'result' || W.state === 'go' ? { ...W, stops: [...W.stops] } : null;
    W.state = 'off'; W.stops = []; drawWalk(); history.replaceState(null, '', location.pathname + location.search);
    if (kept && kept.stops.length) toast('Маршрут закрыт', 6000, { label: 'Вернуть', fn: () => { Object.assign(W, kept, { state: 'result' }); render(); drawWalk(); writeHash(); } });
  }
  else if (t.id === 'w-edit') W.state = 'setup';
  else if (t.id === 'w-go') { W.state = 'go'; W.next = 0; if (window.isSecureContext) startGeo(); openStop(0); drawWalk(); }
  else if (t.id === 'w-next') { W.next++; drawWalk(); if (W.stops[W.next]) openStop(W.next); }
  else if (t.id === 'w-card') return openStop(W.next);
  else if (t.id === 'w-stop') W.state = 'result';
  else if (t.id === 'w-share') return share();
  render();
});
$('#walkbtn').onclick = () => { W.state = 'setup'; if (W.start === 'me' && window.isSecureContext) startGeo(); else if (!window.isSecureContext) W.start = 'center'; render(); };

// along the streets when the municipality graph is there, otherwise straight legs with a detour estimate
async function route(keepOrder) {
  if (!W.stops.length || !window.Router) return;
  const code = (gemAt(W.origin[0], W.origin[1]) || {}).c;
  const r = await Router.solve(code, W.origin, W.stops, { loop: W.loop, maxLen: W.km * 1000 * 1.1, keepOrder });
  if (!r || !r.stops.length) return;
  W.stops = r.stops; W.len = r.len; W.legs = r.legs; W.path = r.path; W.routed = true; W.dropped = r.dropped;
}
async function build() {
  let origin = W.start === 'me' && GEO.pos ? GEO.pos : null;
  if (W.start === 'me' && !origin) { toast('Жду геопозицию… Пока строю от центра карты.'); }
  origin = origin || map.getCenter().toArray();
  const b = $('#w-build'); if (b) { b.textContent = 'Строю…'; b.disabled = true; }
  const t0 = performance.now();
  const r = await plan(origin);
  W.origin = origin; W.stops = r.stops; W.len = r.len; W.path = null; W.legs = null; W.routed = false; W.state = 'result';
  await route(false);
  W.built = { ms: Math.round(performance.now() - t0), pool: r.pool };
  render(); drawWalk(); fit();
  writeHash();
}
function fit() {
  if (!W.stops.length) return;
  const b = new maplibregl.LngLatBounds(W.origin, W.origin);
  W.stops.forEach(s => b.extend(s.ll));
  map.fitBounds(b, { padding: { top: 90 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0), left: 40, right: 60, bottom: $('#walk').offsetHeight + 30 }, pitch: 0, bearing: 0, duration: dur(900), maxZoom: 17 });
}

// arrival: the next stop counts as visited within ARRIVE_M metres
// position and rotation update only the arrow and the distance; the panel is rebuilt when the stop changes
function updateGo() {
  const s = W.stops[W.next], a = $('#walk .arrow'), d = $('#w-dist');
  if (!s || !GEO.pos || !a || !d || a.textContent !== '↑') return render();
  a.style.transform = `rotate(${bearing(GEO.pos, s.ll) - map.getBearing()}deg)`;
  d.textContent = fmtM(dist(GEO.pos, s.ll)) + ' по прямой';
}
function onMove() {
  if (W.state !== 'go' || !GEO.pos) return;
  const s = W.stops[W.next];
  if (s && dist(GEO.pos, s.ll) <= ARRIVE_M) { navigator.vibrate?.(80); W.next++; drawWalk(); toast(`Остановка ${W.next} пройдена`); render(); return; }
  updateGo();
}
map.on('rotate', () => W.state === 'go' && updateGo());

// ---------- export and share ----------
function gmaps(quiet) {
  const ll = p => `${p[1].toFixed(6)},${p[0].toFixed(6)}`;
  const pts = W.stops.map(s => s.ll), dest = W.loop ? W.origin : pts[pts.length - 1];
  const way = (W.loop ? pts : pts.slice(0, -1)).slice(0, 9);
  if (!quiet && W.stops.length > (W.loop ? 9 : 10)) toast('Google Maps принимает до 9 промежуточных точек: в ссылке первые 9.');
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${ll(W.origin)}&destination=${ll(dest)}&waypoints=${encodeURIComponent(way.map(ll).join('|'))}`;
}
function writeHash() {
  if (!W.stops.length) return;
  const h = `walk=${W.origin.map(v => v.toFixed(5)).join(',')};${W.loop ? 1 : 0};${W.stops.map(s => s.gm + '.' + s.id).join(',')}`;
  history.replaceState(null, '', '#' + h);
}
async function share() {
  writeHash();
  const url = location.href;
  try { if (navigator.share) await navigator.share({ title: 'Прогулка LAYRS', url }); else { await navigator.clipboard.writeText(url); toast('Ссылка скопирована'); } }
  catch (e) { if (e.name !== 'AbortError') toast('Ссылка: ' + url, 8000); }
}
async function readHash() {
  const m = location.hash.match(/^#walk=([-\d.]+),([-\d.]+);([01]);(.+)$/); if (!m) return;
  W.origin = [+m[1], +m[2]]; W.loop = m[3] === '1';
  const want = m[4].split(',').map(x => x.split('.'));
  const stops = [];
  for (const [gm, id] of want) {
    if (!poiCache.has(gm)) poiCache.set(gm, fetch(`${DATA}/poi/${gm}.json`).then(r => r.ok ? r.json() : []).catch(() => []));
    const r = (await poiCache.get(gm)).find(r => r[2] === id);
    if (r) stops.push({ ll: [r[0], r[1]], id: r[2], y: r[3], h: r[4], m: r[5], q: r[6] || 0, gm });
  }
  W.stops = stops; W.len = [W.origin, ...stops.map(s => s.ll), ...(W.loop ? [W.origin] : [])].slice(1).reduce((s, p, i, a) => s + dist(i ? a[i - 1] : W.origin, p), 0);
  W.path = null; W.legs = null; W.routed = false;
  await route(true);
  W.state = 'result'; render(); drawWalk(); fit();
}

function initWalk() { locLayers(); walkLayers(); readHash(); }
if (map.isStyleLoaded()) initWalk(); else map.once('load', initWalk);
window.WALK = W; window.GEO = GEO;
})();
