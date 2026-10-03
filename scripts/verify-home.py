"""Offline integrity checks for the personal homepage and its project links."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.ids, self.links, self.images = [], [], [], []
        self.headings = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        self.links.extend(attrs[key] for key in ('href', 'src') if key in attrs)
        if tag == 'h1':
            self.headings += 1
        if tag == 'img':
            assert attrs.get('alt'), 'Image missing alternative text'
            self.images.append(attrs['src'])

    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag, f'Unbalanced HTML: {tag}'


html = (ROOT / 'index.html').read_text()
doc = Document()
doc.feed(html)
assert not doc.stack
assert len(doc.ids) == len(set(doc.ids)), 'Duplicate IDs'
assert doc.headings == 1
for link in doc.links:
    url = urlsplit(link)
    if url.scheme or url.netloc:
        continue
    if url.path:
        assert (ROOT / unquote(url.path)).exists(), link
    elif url.fragment:
        assert url.fragment in doc.ids, link
for project in ['abc', 'lalafood', 'campaign', 'segmentation', 'thelook', 'samba']:
    assert doc.links.count(f'projects/{project}/index.html') >= 1, project
assert 'https://github.com/fiqcodes/smartlook-ai-agent' in doc.links
assert 'mailto:rafiqnaufal97@gmail.com' in doc.links
assert set(['home', 'experience', 'about', 'skills', 'projects', 'learning', 'contact']).issubset(doc.ids)
assert set(['one', 'skill', 'Begin', 'footer']).issubset(doc.ids)
assert 'Work history placeholders' not in html and 'Certificate placeholders' not in html
assert 'LangGraph' in html and 'dbt' in html and 'Apache Airflow' in html
assert html.count('<div class="project-chrome"><h3>') == 7
data = json.loads((ROOT / 'assets/lalafood/data.js').read_text().removeprefix('window.LALAFOOD_DATA = ').rstrip(';\n'))
conversion = sum(segment['bookings'] for segment in data['segment']) / data['sessions'] * 100
assert f'{conversion:.2f}%' == '25.31%'
previews = list((ROOT / 'assets/home/infographics').glob('*.svg'))
assert len(previews) == 7 and sum(path.stat().st_size for path in previews) < 1_000_000
assert all(src.startswith(('assets/home/infographics/', 'assets/home/logos/')) for src in doc.images if src != 'images/profile.jpg')
assert len([src for src in doc.images if src.startswith('assets/home/logos/')]) == 8
assert 'Company 01' not in html and 'Placeholder company logo row' not in html
assert 'site-header' not in html and 'hero-description' not in html
assert 'Company &amp; role details to follow' not in html and 'MY APPROACH' not in html
print('PASS: balanced HTML, unique IDs, accessible infographic images, local assets, 7 project destinations and descriptive titles, legacy anchors, email, toolkit copy, verified conversion, previews under 1 MB.')
