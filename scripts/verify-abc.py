"""Check the frozen ABC source, published data, and local article references."""
import json
import math
import statistics
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT/'scripts/abc-source.json').read_text())
data = json.loads((ROOT/'assets/abc/data.js').read_text().removeprefix('window.ABC_DATA = ').removesuffix(';\n'))
assert len(data['listings']) == 4801
assert [list(r.values()) for r in data['listings']] == source['listings']
assert data['threshold'] == 715000
assert len(data['modelRows']) == 177
assert sum(r['location']=='Desa ParkCity' for r in data['listings']) == 348
for feature, count in [('rooms',4696),('bathrooms',4673),('parking',3388)]:
    assert sum(r[feature] is not None for r in data['listings']) == count
for place, lower, count, med, typ, typ_count in [
    ('Cheras',True,171,450800,'Condominium',80),
    ('Mont Kiara',False,651,1900000,'Condominium',521),
    ('Country Heights Damansara',False,27,8180000,'Bungalow',18),
    ('Bandar Tasik Selatan',True,1,180000,'Flat',1),
    ('Bandar Damai Perdana',False,2,725000,'2-sty Terrace/Link House',2),
]:
    rows=[r for r in data['listings'] if r['location']==place and (r['price']<=715000)==lower]
    assert len(rows)==count and statistics.median(r['price'] for r in rows)==med
    assert sum(r['type']==typ for r in rows)==typ_count
for name, expected in [('full',2129274.63154336),('reduced',2226459.99911809)]:
    model=data['models'][name]
    example=dict(rooms=3,bathrooms=4,parking=3,size=2200)
    pred=model['coefficients'][0]+sum(model['coefficients'][i+1]*example[k] for i,k in enumerate(model['features']))
    assert abs(pred-expected)<.01
    for row,pred,resid in zip(data['modelRows'],model['predicted'],model['residuals']):
        assert abs(row['price']-pred-resid)<1e-6
    assert math.isclose(sum(r*r for r in model['residuals'])/(177-len(model['coefficients'])),model['residualSE']**2)
assert data['models']['full']['coefficientCI'][1][0]<0<data['models']['full']['coefficientCI'][1][1]

class Article(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[];self.refs=[];self.controls=[];self.labels=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag in ['a','script','img','link']:
            ref=a.get('href',a.get('src'))
            if ref:self.refs.append(ref)
        if tag in ['input','select']:self.controls.append(a.get('id'))
        if tag=='label' and 'for' in a:self.labels.append(a['for'])
page=ROOT/'projects/abc/index.html'
html=page.read_text()
parser=Article();parser.feed(html)
assert len(parser.ids)==len(set(parser.ids))
assert '.pdf' not in html.lower()
for ref in parser.refs:
    if ref.startswith('#'):assert ref[1:] in parser.ids, ref
    elif not ref.startswith(('https://','http://')):assert (page.parent/ref).resolve().exists(),ref
assert all(label in parser.ids for label in parser.labels)
print('PASS: source rows, tier counts, 5 neighborhood findings, 2 model scenarios, all residuals, coefficient uncertainty, unique IDs and local references.')
