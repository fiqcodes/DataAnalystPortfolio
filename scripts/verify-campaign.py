"""Offline checks for the campaign article, links, and numerical fixtures."""
import json
import math
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT/'projects/campaign/index.html'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.ids, self.links = [], [], []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        self.links.extend(attrs[k] for k in ['href', 'src'] if k in attrs)

    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag, f'Unbalanced HTML: {tag}'


html = PAGE.read_text()
doc = Document(); doc.feed(html)
assert not doc.stack and len(doc.ids) == len(set(doc.ids))
for link in doc.links:
    url = urlsplit(link)
    if url.scheme or url.netloc:
        continue
    if url.path:
        assert (PAGE.parent/unquote(url.path)).resolve().exists(), link
    elif url.fragment:
        assert url.fragment in doc.ids, link
assert 'pdf' not in html.lower()
raw = (ROOT/'assets/campaign/data.js').read_text()
d = json.loads(raw.removeprefix('window.CAMPAIGN_DATA = ').rstrip(';\n'))
assert d['source']['rows'] == 548 and len(d['stores']) == 137
assert [p['stores'] for p in d['promotions']] == [43,47,47]
assert [m['stores'] for m in d['markets']] == [15,80,42]
assert len({s['id'] for s in d['stores']}) == 137
assert all(1 <= s['age'] <= 28 and 0 < s['sales'] < 110 for s in d['stores'])
for p, expected in zip(d['promotions'], [58.0990116279,47.3294148936,55.3644680851]):
    assert math.isclose(p['mean'], expected, rel_tol=1e-9)
    assert math.isclose(p['mean']*p['stores']*4, p['total'])
    assert math.isclose(sum(p['weeks'])/4, p['mean'])
    stores = [s for s in d['stores'] if s['promotion'] == p['id']]
    assert len(stores) == p['stores']
    assert math.isclose(sum(s['sales'] for s in stores)/len(stores), p['mean'])
for m in d['markets']:
    assert sum(p['stores'] for p in m['promotions']) == m['stores']
    assert math.isclose(sum(p['mean']*p['stores'] for p in m['promotions'])/m['stores'], m['mean'])
    assert min(m['promotions'],key=lambda p:p['mean'])['id'] == 2
for key in ['weekly','store']:
    for i,t in enumerate(d['tests'][key]):
        assert t['low'] < t['difference'] < t['high']
        assert 0 < t['p'] <= t['holm'] <= 1
        assert (t['p'] < .05) == (i < 2)
        assert (t['holm'] < .05) == (i < 2)
        assert (t['low'] <= 0 <= t['high']) == (i == 2)
        assert len(t['density']) == 641
        assert all(v >= 0 for _,v in t['density'])
        if key == 'store':
            original = d['tests']['weekly'][i]
            assert t['high']-t['low'] > original['high']-original['low']
assert math.isclose(d['tests']['weekly'][2]['p'], .1207966705, rel_tol=1e-7)
assert math.isclose(d['model']['r2'], .208746188569, rel_tol=1e-8)
assert d['model']['low'][2] < 0 < d['model']['high'][2]
assert 'LocationID' not in raw and 'MarketID' not in raw
print('PASS: balanced HTML, local links, 548 records, 137 anonymous stores, 9 market means, 6 t-tests, Holm correction, regression fixtures and no PDF references.')
