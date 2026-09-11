"""Freeze workbook inputs and reproduce the ABC story's descriptive statistics and OLS.

Run with numpy/scipy installed. Import once with --workbook PATH (openpyxl also needed),
then rebuild offline from scripts/abc-source.json. Never modifies the source workbook.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.stats import t

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/abc-source.json'
parser = argparse.ArgumentParser()
parser.add_argument('--workbook')
args = parser.parse_args()
if args.workbook:
    import openpyxl
    book = openpyxl.load_workbook(args.workbook, data_only=True)
    formulas = openpyxl.load_workbook(args.workbook, data_only=False)
    assert formulas['EDA (Price Class)']['M2'].value == '=IF(B2<=$Q$18,"Affordable","Luxury")'
    rows = list(book['Cleaned Data Property Listing D'].values)[1:]
    source = dict(
        url='https://docs.google.com/spreadsheets/d/184qBPRyHoO5xHs_qMWRF5497MUslH9DmrzrsxmMPxzA/edit',
        exportDate='2026-09-09',
        workbookSha256=hashlib.sha256(Path(args.workbook).read_bytes()).hexdigest(),
        columns=['location','price','rooms','bathrooms','parking','type','areaBasis','size','furnishing'],
        listings=[[r[0],r[1],r[4],r[5],r[6],r[7],r[8].strip(),r[9],r[11]] for r in rows],
        tierThreshold=book['EDA (Price Class)']['Q18'].value,
        modelColumns=['price','rooms','bathrooms','parking','size'],
        modelRows=[list(r) for r in list(book['(Milestone 2) DesaPark City'].values)[1:]],
    )
    SOURCE.write_text(json.dumps(source, separators=(',', ':'), allow_nan=False)+'\n')

raw = json.loads(SOURCE.read_text())
rows = [dict(zip(raw['columns'], r)) for r in raw['listings']]
prices = np.array([r['price'] for r in rows])
assert len(rows) == 4801 and raw['tierThreshold'] == 715000
assert sum(prices <= raw['tierThreshold']) == 1202
assert np.isclose(prices.mean(), 2166241.716517392)
assert np.median(prices) == 1300000
assert np.quantile(prices, [.25,.75]).tolist() == [715000,2500000]
assert sum(prices > 5177500) == 370
assert len(set(r['location'] for r in rows)) == 65

matrix = np.array(raw['modelRows'], dtype=float)
assert matrix.shape == (177,5) and np.isfinite(matrix).all()
models = {}
for key, indices in [('full',[1,2,3,4]),('reduced',[2,3,4])]:
    x = np.column_stack([np.ones(177), matrix[:,indices]])
    y = matrix[:,0]
    beta, _, rank, _ = np.linalg.lstsq(x,y,rcond=None)
    assert rank == x.shape[1]
    predicted = x @ beta
    resid = y-predicted
    df = len(y)-x.shape[1]
    sse = resid@resid
    error = np.sqrt(sse/df)
    r2 = 1-sse/np.sum((y-y.mean())**2)
    se = np.sqrt(np.diag(np.linalg.inv(x.T@x))*error**2)
    margin = t.ppf(.975,df)*se
    models[key] = dict(features=[raw['modelColumns'][i] for i in indices],
        coefficients=beta.tolist(), coefficientCI=np.column_stack([beta-margin,beta+margin]).tolist(),
        pValues=(2*t.sf(np.abs(beta/se),df)).tolist(), residualSE=float(error),
        r2=float(r2), adjustedR2=float(1-(1-r2)*(len(y)-1)/df),
        predicted=predicted.tolist(), residuals=resid.tolist())
assert np.allclose(models['full']['coefficients'],[-211210.535112713,71340.8849710077,151347.842417535,160744.518274569,472.19890329509])
assert np.isclose(models['full']['residualSE'],435863.000737948)
assert np.isclose(models['reduced']['residualSE'],437426.406287077)
assert np.isclose(np.dot(models['full']['coefficients'],[1,3,4,3,2200]),2129274.63154336)
assert np.isclose(np.dot(models['reduced']['coefficients'],[1,4,3,2200]),2226459.99911809)
data = dict(listings=rows,modelRows=[dict(zip(raw['modelColumns'],r)) for r in raw['modelRows']],
    models=models,threshold=raw['tierThreshold'],source=raw['url'],
    summary=dict(count=len(rows),median=float(np.median(prices)),mean=float(prices.mean()),
        q1=715000,q3=2500000,outliers=370,outlierFence=5177500),
    correlations=dict(zip(raw['modelColumns'][1:],np.corrcoef(matrix.T)[0,1:].tolist())))
out = ROOT/'assets/abc/data.js'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text('window.ABC_DATA = '+json.dumps(data,separators=(',', ':'),allow_nan=False)+';\n')
print('PASS: 4,801 listings; 1,202/3,599 tiers; 177 model rows; both OLS fits and scenarios reproduced.')
print(json.dumps({k:{p:v for p,v in m.items() if p in ['coefficients','adjustedR2','residualSE']} for k,m in models.items()},indent=2))
