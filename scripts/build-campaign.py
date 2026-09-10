"""Export reproducible campaign statistics; source workbook stays outside the site.

Usage: python scripts/build-campaign.py /path/to/campaign_sales.xlsx
Requires numpy, pandas, openpyxl and scipy.
"""
import hashlib
import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
with warnings.catch_warnings():
    warnings.simplefilter('ignore', UserWarning)
    df = pd.read_excel(source, sheet_name='Advanced Dataset')
assert len(df) == 548 and not df.isna().any().any()
assert not df.duplicated(['LocationID', 'week']).any()
assert set(df.week) == {1, 2, 3, 4}
assert df.groupby('LocationID').size().eq(4).all()
for field in ['MarketID', 'MarketSize', 'Promotion', 'AgeOfStore']:
    assert df.groupby('LocationID')[field].nunique().eq(1).all()
stores = df.groupby('LocationID').agg(market=('MarketSize', 'first'),
    promotion=('Promotion', 'first'), age=('AgeOfStore', 'first'),
    sales=('SalesInThousands', 'mean')).reset_index(drop=True)
assert len(stores) == 137
markets = ['Small', 'Medium', 'Large']
promos = []
for i in [1, 2, 3]:
    g = df[df.Promotion == i]
    promos.append(dict(id=i, mean=g.SalesInThousands.mean(), total=g.SalesInThousands.sum(),
        stores=g.LocationID.nunique(), weeks=g.groupby('week').SalesInThousands.mean().tolist()))
np.testing.assert_allclose([p['mean'] for p in promos], [58.0990116279, 47.3294148936, 55.3644680851])
assert [p['stores'] for p in promos] == [43, 47, 47]


def comparisons(frame, group, value, equal_var):
    results = []
    for a, b in [(1, 2), (3, 2), (1, 3)]:
        x, y = (frame.loc[frame[group] == i, value].to_numpy() for i in [a, b])
        test = stats.ttest_ind(x, y, equal_var=equal_var)
        ci = test.confidence_interval(.95)
        results.append(dict(a=a, b=b, difference=x.mean()-y.mean(), t=float(test.statistic),
            df=float(test.df), p=float(test.pvalue), low=float(ci.low), high=float(ci.high), n=[len(x), len(y)]))
    # Holm correction is applied separately within each family of three comparisons.
    ordered = sorted(range(3), key=lambda i: results[i]['p'])
    running = 0
    for rank, i in enumerate(ordered):
        running = min(1, max(running, (3-rank)*results[i]['p']))
        results[i]['holm'] = running
    return results


tests = dict(weekly=comparisons(df, 'Promotion', 'SalesInThousands', True),
    store=comparisons(stores, 'promotion', 'sales', False))
np.testing.assert_allclose([t['p'] for t in tests['weekly']], [3.550669673e-10, 1.562894289e-6, .1207966705], rtol=1e-7)
for family in tests.values():
    for test in family:
        test['density'] = [[round(float(x), 3), float(stats.t.pdf(x, test['df']))] for x in np.linspace(-8, 8, 641)]

market_data = []
for market in markets:
    g = df[df.MarketSize == market]
    market_data.append(dict(name=market, stores=g.LocationID.nunique(), age=g.AgeOfStore.mean(),
        mean=g.SalesInThousands.mean(), promotions=[dict(id=i, mean=v.SalesInThousands.mean(),
        stores=v.LocationID.nunique()) for i in [1, 2, 3] for v in [g[g.Promotion == i]]]))
np.testing.assert_allclose([m['mean'] for m in market_data], [57.4093333333, 43.98534375, 70.1167261905])
for promotion in [None, 1, 2, 3]:
    sample = df if promotion is None else df[df.Promotion == promotion]
    for a, b in [('Small', 'Medium'), ('Medium', 'Large'), ('Small', 'Large')]:
        test = stats.ttest_ind(sample.loc[sample.MarketSize == a, 'SalesInThousands'],
            sample.loc[sample.MarketSize == b, 'SalesInThousands'], equal_var=True)
        assert test.pvalue < .05

# Reproduce the documented ordinal-coded model, not a newly optimized forecast.
X = np.column_stack([np.ones(len(df)), df.MarketSize.map({'Small': 1, 'Medium': 2, 'Large': 3}), df.AgeOfStore])
y = df.SalesInThousands.to_numpy()
coef = np.linalg.lstsq(X, y, rcond=None)[0]
residual = y-X@coef
mse = residual@residual/(len(y)-3)
se = np.sqrt(np.diag(mse*np.linalg.inv(X.T@X)))
p = stats.t.sf(np.abs(coef/se), len(y)-3)*2
critical = stats.t.ppf(.975, len(y)-3)
model = dict(coefficients=coef.tolist(), p=p.tolist(), low=(coef-critical*se).tolist(),
    high=(coef+critical*se).tolist(), r2=1-(residual@residual)/np.sum((y-y.mean())**2),
    ageCorrelation=float(df.AgeOfStore.corr(df.SalesInThousands)))
np.testing.assert_allclose(coef, [24.76827472, 12.59936171, .1194922639], rtol=1e-8)
np.testing.assert_allclose(p[2], .2208671881, rtol=1e-7)

data = dict(source=dict(url='https://docs.google.com/spreadsheets/d/1Q543j8TinbeZlHa4QANiHAO7MqmEsbddcYaWV4dtrC8/edit',
    sha256=hashlib.sha256(source.read_bytes()).hexdigest(), sheet='Advanced Dataset', rows=len(df), stores=len(stores)),
    promotions=promos, markets=market_data, tests=tests, model=model,
    stores=[dict(id=i+1, promotion=int(s.promotion), market=s.market, age=int(s.age), sales=float(s.sales)) for i, s in stores.iterrows()])
out = ROOT/'assets/campaign'
out.mkdir(parents=True, exist_ok=True)
(out/'data.js').write_text('window.CAMPAIGN_DATA = '+json.dumps(data, separators=(',', ':'), allow_nan=False)+';\n')
print(json.dumps({k:v for k,v in data.items() if k not in ['stores','tests']}, indent=2))
print('Tests:', [{k:v for k,v in t.items() if k != 'density'} for t in tests['store']])
