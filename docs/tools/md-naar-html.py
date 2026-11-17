#!/usr/bin/env python3
"""Zet een ontwerpdocument (Markdown) om naar een leesbare HTML-pagina ernaast.

De HTML heeft tabellen met lijnen, duidelijke koppen en afwisselende rijkleuren, een inhoudsopgave, licht/donker
thema en gerenderde Mermaid-diagrammen. Het .md-bestand blijft de bron; draai dit script na elke wijziging:

    python3 docs/tools/md-naar-html.py docs/voorstel-eigen-rollen.md
    python3 docs/tools/md-naar-html.py docs/*.md        (alles; links tussen de documenten wijzen dan naar de HTML)

Ondersteunt de Markdown die in deze docs gebruikt wordt: koppen, alinea's, (geneste) lijsten met codeblokken,
tabellen, citaatblokken, codeblokken, ```mermaid```-blokken, afbeeldingen, losse HTML-blokken, **vet**, *cursief*,
`code` en links. Geen externe pakketten nodig.
"""
import re, sys, html, pathlib

CONVERTING = {pathlib.Path(a).resolve() for a in sys.argv[1:]}

TEMPLATE = r'''<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<style>
  :root {
    --bg: #ffffff; --text: #1d2b36; --muted: #5b6b77; --line: #b9c6cf; --head-bg: #0e8f8a; --head-text: #ffffff;
    --row-alt: #eef5f5; --row-first: #f6f9fa; --code-bg: #eef2f4; --accent: #0e8f8a; --callout: #fff7e0; --callout-line: #e0a100;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #12181d; --text: #e3e9ed; --muted: #9fb0bb; --line: #3a4a55; --head-bg: #0b6f6b; --head-text: #ffffff;
      --row-alt: #1f2b33; --row-first: #182129; --code-bg: #24313a; --accent: #4cc3bd; --callout: #2a2414; --callout-line: #e0a100;
    }
  }
  body { background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    max-width: 1100px; margin: 0 auto; padding: 24px 16px 80px; }
  h1 { font-size: 2rem; margin: .2em 0 .4em; }
  h2 { font-size: 1.45rem; margin: 2.2em 0 .6em; padding-bottom: .25em; border-bottom: 2px solid var(--accent); }
  h3 { font-size: 1.15rem; margin: 1.8em 0 .5em; }
  a { color: var(--accent); }
  code { background: var(--code-bg); padding: .08em .35em; border-radius: 4px; font-size: .88em; }
  .tablewrap { overflow-x: auto; margin: 1em 0 1.4em; }
  table { border-collapse: collapse; width: 100%; font-size: .94rem; }
  th, td { border: 1px solid var(--line); padding: .55em .75em; text-align: left; vertical-align: top; }
  thead th { background: var(--head-bg); color: var(--head-text); font-weight: 700; border-color: var(--head-bg);
    position: sticky; top: 0; }
  tbody tr:nth-child(even) { background: var(--row-alt); }
  tbody th[scope="row"] { font-weight: 600; background: var(--row-first); white-space: nowrap; }
  tbody tr:nth-child(even) th[scope="row"] { background: var(--row-alt); }
  tbody tr:hover td, tbody tr:hover th { background: color-mix(in srgb, var(--accent) 12%, var(--bg)); }
  .callout { background: var(--callout); border-left: 5px solid var(--callout-line); padding: .8em 1em; border-radius: 4px; margin: 1em 0; }
  .toc { border: 1px solid var(--line); border-radius: 8px; padding: .8em 1.2em; margin: 1.2em 0 0; }
  .toc ul { margin: .4em 0 0; padding-left: 0; list-style: none; columns: 2; }
  figure.diagram { margin: 1.2em 0; padding: 1em; border: 1px solid var(--line); border-radius: 8px; overflow-x: auto; background: #fff; }
  figure.diagram pre.mermaid { margin: 0; text-align: center; }
  pre.sketch { background: var(--code-bg); border: 1px solid var(--line); border-radius: 8px; padding: 1em; overflow-x: auto; font-size: .85rem; line-height: 1.45; }
  li { margin: .15em 0; }
  img { max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: 6px; }
  @media (max-width: 700px) { .toc ul { columns: 1; } tbody th[scope="row"] { white-space: normal; } }
  @media print { thead th { position: static; } body { max-width: none; } }
</style>
</head>
<body>
<h1>{{TITLE}}</h1>
{{BODY}}
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: 'default' });</script>
</body>
</html>
'''


def link_target(href, base):
    """Een link naar een ander document dat ook wordt omgezet, gaat naar diens HTML."""
    path, _, anchor = href.partition('#')
    if path.endswith('.md') and (base / path).resolve() in CONVERTING:
        return path[:-3] + '.html' + ('#' + anchor if anchor else '')
    return href


def inline(t, base=pathlib.Path('.')):
    # Codestukken eerst apart zetten, zodat **vet** en [links](...) eromheen kunnen staan.
    codes = []
    def stash(m):
        codes.append('<code>' + html.escape(m.group(1)) + '</code>')
        return f'\x00{len(codes) - 1}\x00'
    p = re.sub(r'`([^`]+)`', stash, t)
    p = html.escape(p, quote=False)
    p = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', p)
    p = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', p)
    p = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1">', p)
    p = re.sub(r'(?<!!)\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="%s">%s</a>' % (link_target(m.group(2), base), m.group(1)), p)
    return re.sub(r'\x00(\d+)\x00', lambda m: codes[int(m.group(1))], p)


def slug(t):
    t = re.sub(r'<[^>]+>', '', t).lower()
    return 'h-' + re.sub(r'[^a-z0-9]+', '-', t).strip('-')

def convert(md_path):
    src = md_path.read_text().split('\n')
    title = next((l[2:].strip() for l in src if l.startswith('# ')), md_path.stem)
    base = md_path.parent
    inl = lambda t: inline(t, base)
    body = []; toc = []
    i = 0
    def cells(line):
        return [c.strip().replace('\\|', '|') for c in re.split(r'(?<!\\)\|', line.strip().strip('|'))]
    while i < len(src):
        l = src[i]
        if l.startswith('```'):
            lang = l[3:].strip(); j = i + 1; buf = []
            while not src[j].startswith('```'): buf.append(src[j]); j += 1
            code = '\n'.join(buf)
            if lang == 'mermaid':
                body.append('<figure class="diagram"><pre class="mermaid">\n' + html.escape(code) + '\n</pre></figure>')
            else:
                body.append('<pre class="sketch">' + html.escape(code) + '</pre>')
            i = j + 1; continue
        m = re.match(r'(#{1,4}) (.*)', l)
        if m:
            lvl = len(m.group(1)); txt = inl(m.group(2))
            if lvl == 1:
                i += 1; continue
            sid = slug(txt)
            if lvl == 2: toc.append((sid, re.sub(r'<[^>]+>', '', txt)))
            body.append(f'<h{lvl} id="{sid}">{txt}</h{lvl}>'); i += 1; continue
        if l.strip() == '---':
            i += 1; continue
        if l.startswith('|'):
            rows = []
            while i < len(src) and src[i].startswith('|'): rows.append(src[i]); i += 1
            head = cells(rows[0]); data = [cells(r) for r in rows[2:]]
            t = ['<div class="tablewrap"><table>', '<thead><tr>' + ''.join(f'<th>{inl(c)}</th>' for c in head) + '</tr></thead><tbody>']
            for r in data:
                t.append('<tr>' + ''.join((f'<th scope="row">{inl(c)}</th>' if k == 0 else f'<td>{inl(c)}</td>') for k, c in enumerate(r)) + '</tr>')
            t.append('</tbody></table></div>'); body.append('\n'.join(t)); continue
        if l.startswith('> '):
            buf = []
            while i < len(src) and src[i].startswith('>'): buf.append(src[i][1:].strip()); i += 1
            body.append('<div class="callout">' + '<br>'.join(inl(b) for b in buf) + '</div>'); continue
        if re.match(r'\s*(- |\d+\. )', l):
            items = []
            def continues(k):
                # Een lege regel hoort bij de lijst als daarna een ingesprongen regel (vervolg) komt.
                while k < len(src) and not src[k].strip(): k += 1
                return k < len(src) and src[k].startswith('  ')
            while i < len(src) and (re.match(r'\s*(- |\d+\. )', src[i]) or (src[i].startswith('  ') and src[i].strip())
                                    or (not src[i].strip() and continues(i))):
                if not src[i].strip():
                    i += 1; continue
                if src[i].strip().startswith('```'):
                    j = i + 1; buf = []
                    while not src[j].strip().startswith('```'): buf.append(src[j].strip()); j += 1
                    items[-1][2].append(('raw', '<pre class="sketch">' + html.escape('\n'.join(buf)) + '</pre>'))
                    i = j + 1; continue
                mm = re.match(r'(\s*)(- |\d+\. )(.*)', src[i])
                if mm:
                    items.append([len(mm.group(1)), 'ul' if mm.group(2) == '- ' else 'ol', [('text', mm.group(3))]])
                elif items[-1][2][-1][0] == 'text' and src[i - 1].strip():
                    items[-1][2][-1] = ('text', items[-1][2][-1][1] + ' ' + src[i].strip())
                else:
                    items[-1][2].append(('text', src[i].strip()))
                i += 1
            def render(k, ind):
                tag = items[k][1]; out = [f'<{tag}>']
                while k < len(items) and items[k][0] >= ind:
                    if items[k][0] > ind:
                        sub, k = render(k, items[k][0]); out[-1] = out[-1][:-5] + sub + '</li>'; continue
                    parts = items[k][2]
                    html_parts = [inl(v) if kind == 'text' else v for kind, v in parts]
                    if len(parts) > 1:  # meerdere alinea's of codeblokken in één punt
                        html_parts = [f'<p>{h}</p>' if kind == 'text' else h for (kind, _), h in zip(parts, html_parts)]
                    out.append('<li>' + ''.join(html_parts) + '</li>'); k += 1
                out.append(f'</{tag}>'); return ''.join(out), k
            body.append(render(0, items[0][0])[0]); continue
        if l.startswith('<'):
            buf = []
            while i < len(src) and src[i].strip(): buf.append(src[i]); i += 1
            body.append('\n'.join(buf)); continue
        if l.strip() == '':
            i += 1; continue
        buf = []
        while i < len(src) and src[i].strip() and not re.match(r'(#|\||```|> |<|\s*- |\s*\d+\. )', src[i]) and src[i].strip() != '---':
            buf.append(src[i].strip()); i += 1
        body.append('<p>' + inl(' '.join(buf)) + '</p>')

    tochtml = '<nav class="toc"><strong>Inhoud</strong><ul>' + ''.join(f'<li><a href="#{s}">{t}</a></li>' for s, t in toc) + '</ul></nav>'
    if len(toc) >= 3:
        first_h2 = next(k for k, b in enumerate(body) if b.startswith('<h2'))
        body.insert(first_h2, tochtml)
    out = TEMPLATE.replace('{{TITLE}}', html.escape(title)).replace('{{BODY}}', '\n'.join(body))
    md_path.with_suffix('.html').write_text(out)
    print(f'{md_path.with_suffix(".html")} geschreven')


if len(sys.argv) < 2:
    sys.exit('Gebruik: python3 docs/tools/md-naar-html.py <bestand.md> [...]')
for arg in sys.argv[1:]:
    convert(pathlib.Path(arg))
