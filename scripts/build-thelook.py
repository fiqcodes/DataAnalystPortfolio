"""Build the TheLook story from a frozen snapshot of the linked analysis sheets.

No live database query is executed. Run: python scripts/build-thelook.py
"""
import hashlib
import json
import math
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'scripts/thelook-source.json'
raw = json.loads(SOURCE.read_text())
revenue = {row[0]: row[1] for row in raw['revenue']['values'][1:]}
profit = [row for row in raw['profit']['values'][1:] if len(row) == 7]
assert len(revenue) == len(profit) == 26
total21 = sum(row[0] for row in profit)
total22 = sum(row[1] for row in profit)
change = total22-total21
assert math.isclose(change, 405137.3193282, abs_tol=1e-5)
categories = []
for p21,p22,increase,growth,name,share,_ in profit:
    assert math.isclose(p22-p21, increase, abs_tol=1e-6)
    assert abs((p22/p21-1)*100-growth) < .0051
    assert math.isclose(increase/change*100, share, abs_tol=1e-8)
    priority = 'Review' if name in ['Jumpsuits & Rompers','Active','Leggings'] else 'Invest' if name in ['Outerwear & Coats','Jeans','Sweaters'] else 'Monitor'
    categories.append(dict(name=name,revenueGrowth=revenue[name],profitGrowth=growth,profit21=p21,
        profit22=p22,increase=increase,increaseShare=share,profitShare=p22/total22*100,priority=priority))

cohorts = []
for row in raw['cohort']['values'][1:]:
    serial,size,month,count,rate = row
    stamp = date(1899,12,30)+timedelta(days=serial)
    assert stamp.year == 2022 and stamp.day == 1
    assert math.isclose(count/size, rate)
    if month == 0:
        cohorts.append(dict(month=stamp.isoformat()[:7],name=stamp.strftime('%b'),size=size,counts=[]))
    c = cohorts[-1]
    assert c['size'] == size and c['month'] == stamp.isoformat()[:7]
    assert month == len(c['counts']) and 0 <= count <= size
    c['counts'].append(count)
assert len(cohorts) == 12
for i,c in enumerate(cohorts):
    assert len(c['counts']) == 12-i and c['counts'][0] == c['size']
    c['rates'] = [n/c['size']*100 for n in c['counts']]
assert [c['size'] for c in cohorts] == [779,728,909,916,937,1010,1075,1208,1329,1468,1568,1895]
assert sum(len(c['counts']) for c in cohorts) == 78
eligible = cohorts[:-1]
pooled = sum(c['counts'][1] for c in eligible)/sum(c['size'] for c in eligible)*100
selected = [c for c in categories if c['priority'] == 'Invest']
data = dict(categories=categories,cohorts=cohorts,
    summary=dict(profit21=total21,profit22=total22,profitIncrease=change,
        buyers=sum(c['size'] for c in cohorts),buyerGrowth=(cohorts[-1]['size']/cohorts[0]['size']-1)*100,
        firstMonthRate=pooled,firstMonthUsers=sum(c['counts'][1] for c in eligible),
        firstMonthEligible=sum(c['size'] for c in eligible),investmentShare=sum(c['increaseShare'] for c in selected)),
    source=dict(snapshotDate='2026-09-10',sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        revenue='https://docs.google.com/spreadsheets/d/1KsUErJfRoHT4jSt8H307V5H-Nl9IhFKxIKRpEs85_d8/edit#gid=0',
        profit='https://docs.google.com/spreadsheets/d/1wycikC7H0uGMFcDpNkH9l6OxkS1HCO-DI3t8_iMEoR0/edit#gid=0',
        cohort='https://docs.google.com/spreadsheets/d/1R271phMAOKHoY9bLoxJ5HnPAk1oP3FKDFzTWFdxBzXQ/edit#gid=1744455102'),
    queries={name:(ROOT/f'projects/thelook/{name}.sql').read_text() for name in ['growth','retention','retention-completed']})
out = ROOT/'assets/thelook/data.js'
out.parent.mkdir(exist_ok=True,parents=True)
out.write_text('window.THELOOK_DATA = '+json.dumps(data,separators=(',', ':'),allow_nan=False)+';\n')
print(json.dumps(data['summary'],indent=2))
print('PASS: 26 category growth rows, 78 cohort cells, 12 cohort sizes, and profit-contribution formulas reconciled.')
