"""Verify aggregate reconciliation, source findings and the local Samba article."""
import json
import math
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT/'scripts/samba-source.json').read_text())
data = json.loads((ROOT/'assets/samba/data.js').read_text().removeprefix('window.SAMBA_DATA = ').removesuffix(';\n'))
assert data == source
total = data['summary']
assert total['orders'] == 49544 and total['customers'] == 48022 and total['sellers'] == 1771
assert total['paymentCents'] == 781287264 and total['items'] == 56513
assert round(total['paymentCents']/100/total['orders'],2) == 157.70
for group in ['months','states','cities','categories']:
    rows = data[group]
    assert len({r['name'] for r in rows}) == len(rows)
    for field in ['orders','items','paymentCents']:
        assert sum(r[field] for r in rows) == total[field], (group,field)
    assert all(0 < r['customers'] <= r['orders'] and 0 < r['sellers'] <= r['orders'] for r in rows)
assert len(data['months']) == 13 and len(data['states']) == 27 and len(data['categories']) == 72
jan, dec = data['months'][-1], data['months'][-2]
assert (jan['orders'],jan['customers'],jan['sellers']) == (6900,6802,933)
assert [round((jan[k]/dec[k]-1)*100,1) for k in ['orders','customers','sellers']] == [28.2,27.9,12.5]
assert [round(r['paymentCents']/100/r['orders'],2) for r in [dec,jan]] == [152.22,152.23]
assert max(data['months'],key=lambda r:r['orders'])['name'] == '2021-11'
assert max(data['months'],key=lambda r:r['paymentCents']/r['orders'])['name'] == '2021-09'
sp = next(r for r in data['states'] if r['name']=='SP')
assert sp['customers'] == 19048
city = max(data['cities'],key=lambda r:r['orders'])
assert city['name']=='sao paulo, SP' and city['orders']==7020
city = next(r for r in data['cities'] if r['name']=='monte alegre do sul, SP')
assert city['name']=='monte alegre do sul, SP' and city['orders']==1 and city['paymentCents']==302408
city = max(data['cities'],key=lambda r:r['paymentCents']/r['orders'])
assert city['name']=='trindade, PE' and city['orders']==1 and city['paymentCents']==318455
cats = sorted(data['categories'],key=lambda r:r['orders'],reverse=True)
assert [r['orders'] for r in cats[:3]] == [5052,4095,3856]
assert round(sum(r['orders'] for r in cats[:3])/total['orders']*100,1)==26.2
cat = max(cats,key=lambda r:r['items']/r['orders'])
assert cat['name']=='Hygiene Diapers' and cat['orders']==2 and cat['items']==7
assert next(r for r in cats if r['name']=='Telephony')['orders']==2308
assert data['join']['unmatchedOrders']==0
assert not any(k in (ROOT/'assets/samba/data.js').read_text() for k in ['geolocation_lat','customer id','seller_id'])

class Article(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.refs=[]; self.labels=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag in ['a','script','img','link']:
            ref=a.get('href',a.get('src'))
            if ref:self.refs.append(ref)
        if tag=='label' and 'for' in a:self.labels.append(a['for'])

page = ROOT/'projects/samba/index.html'
html = page.read_text()
p = Article(); p.feed(html)
assert len(p.ids)==len(set(p.ids))
assert 'pdf' not in html.lower()
for ref in p.refs:
    if ref.startswith('#'):assert ref[1:] in p.ids,ref
    elif not ref.startswith(('https://','http://','data:')):assert (page.parent/ref).resolve().exists(),ref
assert all(label in p.ids for label in p.labels)
print('PASS: 49,544 orders; four aggregate reconciliations; 13 months; growth rates; market and category leaders; small samples; privacy; HTML references.')
