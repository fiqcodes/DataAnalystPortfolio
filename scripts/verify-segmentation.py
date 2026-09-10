"""Offline integrity checks for the segmentation article and anonymous aggregates."""
import json
import math
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'projects/segmentation/index.html'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.ids, self.links, self.words = [], [], [], []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('src','href'):
            if key in attrs:
                self.links.append(attrs[key])
    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag, 'Unbalanced HTML: '+tag
    def handle_data(self, text):
        self.words.extend(text.split())

html = PAGE.read_text()
doc = Document(); doc.feed(html)
assert not doc.stack and len(doc.ids) == len(set(doc.ids))
for url in doc.links:
    part = urlsplit(url)
    if part.scheme or part.netloc:
        continue
    if part.path:
        assert (PAGE.parent / unquote(part.path)).resolve().exists(), url
    elif part.fragment:
        assert part.fragment in doc.ids, url
assert '.pdf' not in html.lower() and ' pdf' not in html.lower()
assert all(s in doc.ids for s in ['audience','clustering','segments','risk','prediction','economics','action'])
raw = (ROOT / 'assets/segmentation/data.js').read_text()
data = json.loads(raw.removeprefix('window.SEGMENTATION_DATA = ').rstrip(';\n'))
assert data['total'] == 8277 and data['segmented'] == 7667 and data['excluded'] == 610
assert [s['count'] for s in data['segments']] == [2798,2347,812,1710]
assert sum(s['churnCount'] for s in data['segments']) == 3091
assert math.isclose(sum(s['share'] for s in data['segments']),100)
assert 'user_id' not in raw and 'registration_import_datetime' not in raw
for demo in data['demo']['runs'].values():
    assert len(demo['frames']) == 8
    inertia = [f['inertia'] for f in demo['frames']]
    assert all(b <= a+1e-10 for a,b in zip(inertia,inertia[1:]))
    assert all(len(f['labels']) == 80 for f in demo['frames'])
for s,balance in zip(data['segments'],[309756,570830,1536123,2438934]):
    assert int(s['balance']) == balance
    assert math.isclose(s['churn'],s['churnCount']/s['count']*100)
    c = s['campaign']
    result = c['transaction']*c['fee']*c['multiplier']*(c['target']-c['churn'])-c['transaction']*c['fee']*c['churn']-c['target']*c['cost']
    assert abs(result-c['net']) < .01 and result < 0
for demographic in data['demographics'].values():
    assert sum(d['count'] for d in demographic) == 8277
for signals in data['signals'].values():
    assert sum(d['count'] for d in signals) == 7667
    assert sum(d['churn'] for d in signals) == 3091
for v in data['validation']['thresholds']:
    (tn,fp),(fn,tp) = v['matrix']
    assert tn+fp+fn+tp == 1534
    assert math.isclose((tn+tp)/1534,v['accuracy'])
    assert math.isclose(tp/(tp+fp),v['precision'])
    assert math.isclose(tp/(tp+fn),v['recall'])
print('PASS: valid HTML and local links; 4 exact segment counts; 3,091 churn labels; 4 reconciled campaign baselines; 19 validated thresholds; no row-level IDs or PDF references.')
