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
        self.links.extend(attrs[key] for key in ('href', 'src', 'poster') if key in attrs)
        if tag == 'video':
            assert 'a' not in self.stack, 'Video controls must not be inside a link'
            assert 'controls' in attrs and 'playsinline' in attrs
            assert attrs.get('preload') == 'metadata' and 'autoplay' in attrs and 'loop' in attrs
        if tag == 'h1':
            self.headings += 1
        if tag == 'img':
            assert attrs.get('alt'), 'Image missing alternative text'
            self.images.append(attrs['src'].split('?', 1)[0])

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
assert 'https://smartlook-ai-agent.vercel.app/' in doc.links
assert 'https://gis-ai-agent.vercel.app/' in doc.links
assert html.count('<video ') == 8
for project in ['abc', 'lalafood', 'campaign', 'segmentation', 'thelook', 'samba']:
    assert f'assets/home/demos/{project}.webm' in doc.links
    assert f'assets/home/demos/{project}.jpg' in doc.links
assert 'assets/home/demos/smartlook.mp4' in doc.links
assert 'assets/home/demos/orbiview.mp4' in doc.links
assert '<span class="shortcut-label">Certificates</span>' in html
assert 'mailto:rafiqnaufal97@gmail.com' in doc.links
assert set(['home', 'experience', 'about', 'skills', 'projects', 'learning', 'contact']).issubset(doc.ids)
assert set(['one', 'skill', 'Begin', 'footer']).issubset(doc.ids)
assert 'Work history placeholders' not in html and 'Certificate placeholders' not in html
assert 'LangGraph' in html and 'dbt' in html and 'Apache Airflow' in html
assert html.count('<div class="project-chrome"><h3>') == 8
data = json.loads((ROOT / 'assets/lalafood/data.js').read_text().removeprefix('window.LALAFOOD_DATA = ').rstrip(';\n'))
conversion = sum(segment['bookings'] for segment in data['segment']) / data['sessions'] * 100
assert f'{conversion:.2f}%' == '25.31%'
previews = list((ROOT / 'assets/home/infographics').glob('*.svg'))
assert len(previews) == 8 and sum(path.stat().st_size for path in previews) < 1_000_000
assert all(src.startswith(('assets/home/infographics/', 'assets/home/logos/', 'assets/home/certificates/')) for src in doc.images if src != 'images/profile.jpg')
certificate_images = [src for src in doc.images if src.startswith('assets/home/certificates/')]
certificate_pdfs = [link for link in doc.links if link.startswith('assets/home/certificates/') and link.endswith('.pdf')]
assert len(certificate_images) == len(set(certificate_images)) == 9
assert len(certificate_pdfs) == len(set(certificate_pdfs)) == 9
assert {Path(src).stem for src in certificate_images} == {Path(src).stem for src in certificate_pdfs}
assert all((ROOT / path).read_bytes().startswith(b'%PDF-') for path in certificate_pdfs)
assert 'placeholder-certificate' not in html and 'ISSUER TO FOLLOW' not in html
assert len([src for src in doc.images if src.startswith('assets/home/logos/')]) == 8
assert 'Company 01' not in html and 'Placeholder company logo row' not in html
assert 'site-header' not in html and 'hero-description' not in html
assert 'Company &amp; role details to follow' not in html and 'MY APPROACH' not in html
print('PASS: balanced HTML, unique IDs, local assets, 8 video previews and project destinations, legacy anchors, email, toolkit copy, verified conversion, retained infographic assets under 1 MB.')
