"""LAYRS logo «Отражение»: the word stands on a canal and its reflection breaks into stripes.
Letters are Manrope ExtraBold (OFL) turned into paths, so the files do not depend on fonts.
Run with fonttools installed; writes SVG here and PNG app icons via rsvg-convert."""
import subprocess
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

HERE = Path(__file__).parent
FONT = HERE.parent / 'app/node_modules/@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'
INK, PAPER, DELFT = '#1d1b17', '#f3efe4', '#1f4f96'
f = TTFont(FONT); gs = f.getGlyphSet(); cmap = f.getBestCmap(); UPM = f['head'].unitsPerEm

def word(text, size, track=0.0):
    """Path data for text at font size `size`, baseline y=0, starting x=0; returns (d, width)."""
    k = size / UPM; x = 0; ds = []
    for ch in text:
        g = cmap[ord(ch)]; pen = SVGPathPen(gs)
        gs[g].draw(pen)
        ds.append(f'<path transform="translate({x:.2f},0) scale({k:.5f},{-k:.5f})" d="{pen.getCommands()}"/>')
        x += gs[g].width * k + track * size
    return ''.join(ds), x - track * size

def cap_height(size):
    bp = BoundsPen(gs); gs[cmap[ord('L')]].draw(bp); return bp.bounds[3] * size / UPM

# reflection stripes: (top, height) as shares of the reflection depth, and opacity; thinner and fainter going down
STRIPES = [(0.00, 0.15, 1.0), (0.22, 0.12, 0.8), (0.41, 0.10, 0.6), (0.58, 0.08, 0.42), (0.73, 0.06, 0.26)]
def mark(text, size, track, uid, ink=INK, water=DELFT, gap=0.035):
    """The word and, under it, its reflection cut into thinning, fading stripes."""
    d, w = word(text, size, track); ch = cap_height(size)
    top = size * gap; refl = ch * 0.7
    out = [f'<g fill="{ink}">{d}</g>']
    defs = []
    for i, (y, h, o) in enumerate(STRIPES):
        defs.append(f'<clipPath id="{uid}c{i}"><rect x="-10" y="{top + y * refl:.2f}" width="{w + 20:.2f}" height="{h * refl:.2f}"/></clipPath>')
        out.append(f'<g clip-path="url(#{uid}c{i})" opacity="{o}"><g fill="{water}" transform="translate(0,{top:.2f}) scale(1,-0.7)">{d}</g></g>')
    return f'<defs>{"".join(defs)}</defs>' + ''.join(out), w, ch, top + refl

def doc(w, h, body, bg=None, rx=0):
    rect = f'<rect width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{rect}{body}</svg>\n'

def write(name, svg): (HERE / name).write_text(svg); return HERE / name

# wordmark
m, w, ch, depth = mark('LAYRS', 200, 0.04, 'w')
W, H, P = int(w + 80), int(ch + depth + 80), 40
write('logo.svg', doc(W, H, f'<g transform="translate({P},{P + ch:.1f})">{m}</g>'))
write('logo-dark.svg', doc(W, H, f'<g transform="translate({P},{P + ch:.1f})">{mark("LAYRS", 200, 0.04, "d", ink=PAPER, water="#8fb2e6")[0]}</g>', bg=INK))
# wordmark with the slogan
SLOGAN = 'LOOK AT YOUR CITY LIKE NEVER BEFORE'
fm = TTFont(HERE.parent / 'app/node_modules/@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf')
gsm, cm = fm.getGlyphSet(), fm.getBestCmap()
def word2(text, size, track):
    k = size / UPM; x = 0; ds = []
    for c in text:
        g = cm[ord(c)]; pen = SVGPathPen(gsm); gsm[g].draw(pen)
        ds.append(f'<path transform="translate({x:.2f},0) scale({k:.5f},{-k:.5f})" d="{pen.getCommands()}"/>'); x += gsm[g].width * k + track * size
    return ''.join(ds), x - track * size
sd, sw = word2(SLOGAN, 26, 0.18)
H2 = int(H + 40)
write('logo-slogan.svg', doc(W, H2, f'<g transform="translate({P},{P + ch:.1f})">{m}</g><g fill="#6a6458" transform="translate({(W - sw) / 2:.1f},{H2 - 34})">{sd}</g>'))

# app icon: the L and its reflection on paper, centred in the safe area
def icon(size, bg, ink, water, uid, safe=0.6, rx=None):
    s = size * safe; mk, lw, lch, ldepth = mark('L', s, 0, uid, ink=ink, water=water)
    total = lch + ldepth; x = (size - lw) / 2; y = (size - total) / 2 + lch
    return doc(size, size, f'<g transform="translate({x:.1f},{y:.1f})">{mk}</g>', bg=bg, rx=rx if rx is not None else 0)

write('icon.svg', icon(1024, PAPER, INK, DELFT, 'i'))
write('icon-dark.svg', icon(1024, INK, PAPER, '#8fb2e6', 'k'))
write('icon-foreground.svg', icon(1024, None, INK, DELFT, 'f', safe=0.4))
write('icon-monochrome.svg', icon(1024, None, '#000000', '#000000', 'm', safe=0.4))
write('splash.svg', doc(W, H, f'<g transform="translate({P},{P + ch:.1f})">{m}</g>'))

def png(src, out, w):
    subprocess.run(['rsvg-convert', '-w', str(w), '-o', str(out), str(HERE / src)], check=True)
img = HERE.parent / 'app/assets/images'
png('icon.svg', img / 'icon.png', 1024)
png('icon-foreground.svg', img / 'android-icon-foreground.png', 1024)
png('icon-monochrome.svg', img / 'android-icon-monochrome.png', 1024)
png('icon.svg', img / 'favicon.png', 48)
png('splash.svg', img / 'splash-icon.png', 600)
png('logo.svg', HERE / 'logo.png', 1200)
png('logo-slogan.svg', HERE / 'logo-slogan.png', 1200)
png('logo-dark.svg', HERE / 'logo-dark.png', 1200)
png('icon-dark.svg', HERE / 'icon-dark.png', 512)
print('ok', W, H)
