// LAYRS NL stand: city lenses (layers/<GMcode>.json, built by p14_city_layers.py from the city sites).
// A lens colours its buildings by group through feature-state on the national tiles; everything else turns grey.
// Uses globals from m.html: map, $, DATA, NUM, here, mode, periodQ, monColor, showCard, sheetH, dur.
(() => {
const CITIES_WITH_LENSES = new Set(['GM0363', 'GM0503']);
const COLORS = ['#ec0000', '#1f4e8c', '#d99a12', '#2e8b57', '#7b3fa0', '#00909a', '#8c5a2b', '#d6336c'];
const OTHER = '#dedbd3';
const cache = new Map();
const L = { code: null, data: null, active: null, view: 'list' };

const load = code => {
  if (!cache.has(code)) cache.set(code, fetch(`${DATA}/layers/${code}.json`).then(r => r.ok ? r.json() : null).catch(() => null));
  return cache.get(code);
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- map colouring ----
function clearStates() { for (const s of ['b', 'bl']) map.removeFeatureState({ source: s, sourceLayer: 'b' }); }
function paint() {
  let color;
  if (L.active) {
    const groups = L.active.groups;
    color = ['case', ['!=', ['feature-state', 'g'], null],
      ['match', ['feature-state', 'g'], ...groups.flatMap((g, i) => [i, COLORS[i % COLORS.length]]), OTHER], OTHER];
  } else color = mode === 'mon' ? monColor : periodQ;
  for (const l of ['b', 'bl']) map.setPaintProperty(l, 'fill-extrusion-color', color);
}
function applyLens(layer) {
  clearStates();
  L.active = layer;
  if (layer) {
    const bitToGroup = new Map(layer.groups.map((g, i) => [g.bit, i]));
    for (const [bag, bits] of Object.entries(L.data.b)) {
      const hit = bits.find(b => bitToGroup.has(b));
      if (hit === undefined) continue;
      const id = Number(bag), st = { g: bitToGroup.get(hit) };
      map.setFeatureState({ source: 'b', sourceLayer: 'b', id }, st);
      map.setFeatureState({ source: 'bl', sourceLayer: 'b', id }, st);
    }
  }
  paint();
  $('#lensbtn').textContent = layer ? `Линза: ${layer.title}` : `Линзы · ${L.data ? L.data.layers.length : ''}`;
  $('#lensbtn').classList.toggle('on', !!layer);
  $('#lensbtn').setAttribute('aria-pressed', !!layer);
}
window.lensPaint = paint;            // m.html calls it after a mode switch

// ---- panel ----
function render() {
  const p = $('#lens'), d = L.data;
  if (!d) return;
  if (L.view === 'list') {
    const sections = [];
    for (const l of d.layers) { let s = sections.find(x => x.name === l.section); if (!s) sections.push(s = { name: l.section, items: [] }); s.items.push(l); }
    p.innerHTML = `<h3>Линзы · ${esc(d.city)}</h3>
      <p class="sum">Слои истории города с сайта LAYRS ${esc(d.city)}. Тексты пока на английском.</p>
      ${L.active ? '<button id="l-off">Без линзы</button>' : ''}
      ${sections.map(s => `<div class="lbl">${esc(s.name)}</div><ul class="lenslist">${s.items.map(l =>
        `<li><button data-id="${esc(l.id)}" aria-pressed="${L.active === l}"><span>${esc(l.title)}</span><small>${esc(l.era || '')} · ${NUM.format(l.count)}</small></button></li>`).join('')}</ul>`).join('')}
      <div class="act"><button id="l-close">Закрыть</button></div>`;
  } else {
    const l = L.active, notes = Object.entries(l.notes).filter(([, n]) => n.ll);
    p.innerHTML = `<button id="l-back" class="back">← Все линзы</button>
      <h3>${esc(l.title)}</h3><div class="sum">${esc(l.era || '')} · ${esc(l.section)}</div>
      <ul class="legend">${l.groups.map((g, i) => `<li><span class="sw" style="background:${COLORS[i % COLORS.length]}"></span>${esc(g.label)} <small>${NUM.format(g.count)}</small></li>`).join('')}</ul>
      <p class="story">${esc(l.text)}</p>
      ${l.caveat ? `<p class="sum">${esc(l.caveat)}</p>` : ''}
      ${notes.length ? `<div class="lbl">Здания с историями · ${NUM.format(notes.length)}</div>
        <ul class="lenslist">${notes.slice(0, 60).map(([bag, n]) => `<li><button data-note="${bag}"><span>${esc(n.name || n.address || 'BAG ' + bag)}</span><small>${esc(n.address || '')}</small></button></li>`).join('')}</ul>
        ${notes.length > 60 ? `<p class="sum">Показаны первые 60.</p>` : ''}` : ''}
      ${l.source && l.source.url ? `<p class="sum">Источник: <a href="${esc(l.source.url)}" target="_blank" rel="noopener">${esc(l.source.label)}</a></p>` : ''}
      <div class="act"><button id="l-off">Без линзы</button><button id="l-close">Закрыть</button></div>`;
  }
  p.hidden = false; $('#sheet').hidden = true; sheetH();
}
function close() { $('#lens').hidden = true; $('#sheet').hidden = false; sheetH(); }

$('#lens').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.id) { applyLens(L.data.layers.find(l => l.id === t.dataset.id)); L.view = 'detail'; fitLens(); return render(); }
  if (t.dataset.note) {
    const n = L.active.notes[t.dataset.note];
    const id = Number(t.dataset.note);
    map.flyTo({ center: n.ll, zoom: Math.max(map.getZoom(), 16.5), duration: dur(1000) });
    map.once('idle', () => {
      const f = map.querySourceFeatures('b', { sourceLayer: 'b', filter: ['==', ['get', 'id'], id] })[0];
      showCard(f || { properties: { id, y: 0, h: 0 } });
    });
    return;
  }
  if (t.id === 'l-back') { L.view = 'list'; return render(); }
  if (t.id === 'l-off') { applyLens(null); L.view = 'list'; return render(); }
  if (t.id === 'l-close') close();
});
function fitLens() {
  const pts = Object.values(L.active.notes).filter(n => n.ll).map(n => n.ll);
  if (pts.length < 2 || pts.length > 400) return;
  const b = new maplibregl.LngLatBounds(pts[0], pts[0]); pts.forEach(p => b.extend(p));
  map.fitBounds(b, { padding: { top: 90, left: 30, right: 30, bottom: Math.round(innerHeight * 0.5) }, maxZoom: 16, duration: dur(900) });
}

// card: lens memberships and the story for a building, used by showCard in m.html
window.lensCard = bag => {
  const d = L.data; if (!d) return '';
  bag = String(bag).padStart(16, '0');
  const bits = d.b[bag]; if (!bits) return '';
  const rows = [];
  for (const l of d.layers) {
    const gi = l.groups.findIndex(g => bits.includes(g.bit)); if (gi < 0) continue;
    const n = l.notes[bag];
    rows.push(`<div class="lensrow"><span class="sw" style="background:${COLORS[gi % COLORS.length]}"></span><b>${esc(l.title)}</b>${l.groups.length > 1 ? ' · ' + esc(l.groups[gi].label) : ''}
      ${n && n.story ? `<p class="story">${n.name ? `<b>${esc(n.name)}.</b> ` : ''}${esc(n.story)}${n.source ? ` <a href="${esc(n.source)}" target="_blank" rel="noopener">источник</a>` : ''}</p>` : ''}</div>`);
  }
  return rows.length ? `<div class="lenses">${rows.join('')}</div>` : '';
};

// ---- follow the municipality under the map centre ----
async function sync() {
  const code = here && CITIES_WITH_LENSES.has(here.c) ? here.c : null;
  const btn = $('#lensbtn');
  if (code === L.code) return;
  L.code = code;
  if (!code) { if (L.active) applyLens(null); btn.hidden = true; L.data = null; return; }
  L.data = await load(code);
  btn.hidden = !L.data;
  if (L.data) { btn.textContent = `Линзы · ${L.data.layers.length}`; }
}
$('#lensbtn').onclick = () => { if (!L.data) return; L.view = L.active ? 'detail' : 'list'; render(); };
map.on('moveend', sync);
setTimeout(sync, 1500);
window.LENS = L;
})();
