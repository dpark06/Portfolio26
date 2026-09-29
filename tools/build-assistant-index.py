"""Rebuild js/assistant-index.js from the case study pages.

Run from the site folder after adding or editing a project:  python3 tools/build-assistant-index.py
Every work/*.html page is picked up automatically. The "which projects use 3D / Figma / research…"
answers come from each page's Role, Team, and Tools facts, so fill those in on a new page.
"""
import re, html, json, glob, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def clean(s):
    s = re.sub(r'<[^>]+>', ' ', s); s = html.unescape(s); return re.sub(r'\s+', ' ', s).strip()

# Known pages keep their display names and order; new work/*.html pages are appended, named from <title>.
pages = {'work/providence-promise.html': 'Providence Promise', 'work/bodega-cats.html': 'Not Only for Bodega Cats',
         'work/mr-zeno.html': 'Mr. Zeno', 'work/head-in-the-clouds.html': 'Head in the Clouds',
         'work/cheil.html': 'Cheil USA (Samsung)', 'work/moving-type-face.html': 'Moving [Type] Face',
         'work/living-outside.html': 'Living Outside', 'work/pocket-sauce.html': 'Pocket Sauce'}
for f in sorted(glob.glob('work/*.html')):
    if f not in pages:
        t = re.search(r'<title>(.*?)</title>', open(f).read(), re.S)
        pages[f] = clean(t.group(1)).split(' — ')[0] if t else os.path.basename(f)[:-5].replace('-', ' ').title()
pages['about.html'] = 'About Dominic'

out = []
for f, proj in pages.items():
    s = open(f).read()
    lede = re.search(r'class="cs-hero__lede[^"]*">(.*?)</p>', s, re.S)
    facts = re.findall(r'<dt>(.*?)</dt><dd>(.*?)</dd>', s)
    if lede or facts:
        out.append({'p': proj, 't': 'Overview', 'h': f, 'x': clean(lede.group(1)) if lede else '',
                    'f': '; '.join(f'{clean(a)}: {clean(b)}' for a, b in facts)})
    for m in re.finditer(r'<section class="(?:chapter[^"]*|takeaway)"[^>]*id="([^"]+)"[^>]*>(.*?)</section>', s, re.S):
        sid, body = m.group(1), m.group(2)
        h2 = re.search(r'<h2[^>]*>(.*?)</h2>', body, re.S)
        lab = re.search(r'class="chapter__label"><span>\d+</span>\s*(.*?)</p>', body, re.S)
        paras = [clean(p) for p in re.findall(r'<p(?: class="(?:reveal|aside-note reveal)")?>(.*?)</p>', body, re.S)]
        paras = [p for p in paras if len(p) > 40]
        if sid == 'challenge' and len(paras) > 1: paras = paras[1:]   # skip the generic intro line
        li = [clean(x) for x in re.findall(r'<li>(.*?)</li>', body, re.S)][:8]
        out.append({'p': proj, 't': clean(lab.group(1)) if lab else '', 'hd': clean(h2.group(1)) if h2 else '',
                    'h': f'{f}#{sid}', 'x': ' '.join(paras)[:1400], 'l': li})

s = open('about.html').read()
bio = ' '.join(clean(p) for p in re.findall(r'<p class="reveal">(.*?)</p>', s, re.S))
out.append({'p': 'About Dominic', 't': 'Bio', 'h': 'about.html', 'x': bio})

open('js/assistant-index.js', 'w').write('/* Auto-built by tools/build-assistant-index.py. Used by assistant.js. */\nwindow.ASK_INDEX = '
                                         + json.dumps(out, ensure_ascii=False) + ';\n')
print(f'{len(out)} entries from {len(pages)} pages')
