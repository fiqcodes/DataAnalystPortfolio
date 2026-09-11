"""Offline integrity checks for TheLook's preserved results and article."""
import hashlib
import json
import math
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT/'projects/thelook/index.html'
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
        self.links.extend(attrs[k] for k in ['href','src'] if k in attrs)

    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag, f'Unbalanced HTML: {tag}'


html = PAGE.read_text()
doc = Document(); doc.feed(html)
assert not doc.stack and len(doc.ids) == len(set(doc.ids))
for link in doc.links:
    u = urlsplit(link)
    if u.scheme or u.netloc:
        continue
    if u.path:
        assert (PAGE.parent/unquote(u.path)).resolve().exists(), link
    elif u.fragment:
        assert u.fragment in doc.ids, link
assert 'pdf' not in html.lower()
data = json.loads((ROOT/'assets/thelook/data.js').read_text().removeprefix('window.THELOOK_DATA = ').rstrip(';\n'))
assert data['source']['sha256'] == hashlib.sha256((ROOT/'scripts/thelook-source.json').read_bytes()).hexdigest()
categories, cohorts, summary = data['categories'], data['cohorts'], data['summary']
assert len(categories) == 26 and len({c['name'] for c in categories}) == 26
assert math.isclose(sum(c['increaseShare'] for c in categories),100)
assert math.isclose(sum(c['profitShare'] for c in categories),100)
assert all(c['revenueGrowth'] > 0 and c['profitGrowth'] > 0 for c in categories)
assert min(categories,key=lambda c:c['profitGrowth'])['name'] == 'Jumpsuits & Rompers'
assert min(categories,key=lambda c:c['revenueGrowth'])['name'] == 'Jumpsuits & Rompers'
assert sorted(c['name'] for c in categories if c['priority']=='Invest') == ['Jeans','Outerwear & Coats','Sweaters']
assert sorted(c['name'] for c in categories if c['priority']=='Review') == ['Active','Jumpsuits & Rompers','Leggings']
assert math.isclose(summary['investmentShare'],31.544896910982832)
for c in categories:
    assert abs((c['profit22']/c['profit21']-1)*100-c['profitGrowth']) < .0051
    assert math.isclose(c['increase'],c['profit22']-c['profit21'])
    assert math.isclose(c['increaseShare'],c['increase']/summary['profitIncrease']*100)
assert len(cohorts)==12 and sum(len(c['counts']) for c in cohorts)==78
assert sum(c['size'] for c in cohorts)==13822
for i,c in enumerate(cohorts):
    assert len(c['counts'])==len(c['rates'])==12-i
    assert c['counts'][0]==c['size'] and c['rates'][0]==100
    for n,p in zip(c['counts'],c['rates']):
        assert 0<=n<=c['size'] and math.isclose(n/c['size']*100,p)
assert len(cohorts[-1]['rates'])==1
assert math.isclose(cohorts[0]['rates'][1],25/779*100)
assert math.isclose(cohorts[10]['rates'][1],200/1568*100)
assert summary['firstMonthUsers']==892 and summary['firstMonthEligible']==11927
assert math.isclose(summary['firstMonthRate'],892/11927*100)
assert math.isclose(summary['buyerGrowth'],(1895/779-1)*100)
for key,text in data['queries'].items():
    assert text==(ROOT/f'projects/thelook/{key}.sql').read_text()
assert "AND o.status = 'Complete'" not in data['queries']['retention']
assert "AND o.status = 'Complete'" in data['queries']['retention-completed']
assert 'GENERATE_ARRAY' in data['queries']['retention-completed']
assert 'SELECT DISTINCT' in data['queries']['retention']
print('PASS: HTML/local links; 26 categories; 78 observed cohort cells; 13,822 buyers; 892/11,927 M1 activity; contribution formulas; three matching SQL files; no PDF references.')
