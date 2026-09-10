"""Reconstruct the documented segments and export anonymous article aggregates.

Usage: python scripts/build-segmentation.py /path/to/source-directory
Inputs: python_users.xlsx, python_daily_user_transaction.xlsx,
python_churn_users.xlsx, benefit_cost.xlsx. Raw records never enter the site.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from openpyxl import load_workbook
from scipy.stats import chi2
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.datasets import make_blobs
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
OUT = ROOT / 'assets/segmentation'
OUT.mkdir(parents=True, exist_ok=True)
u = pd.read_excel(SOURCE / 'python_users.xlsx')
t = pd.read_excel(SOURCE / 'python_daily_user_transaction.xlsx').fillna(0)
c = pd.read_excel(SOURCE / 'python_churn_users.xlsx')
u['referral_code_used'] = u.referral_code_used.fillna('no referral')
assert not u.user_id.duplicated().any() and not c.user_id.duplicated().any()
assert not t.duplicated(['user_id', 'date']).any()
last = t.groupby('user_id').last()[['total_invested_amount']].rename(columns={'total_invested_amount': 'last_amount_total'})
buy = t[t.total_buy_transaction_amount > 0].groupby('user_id').size()
sell = t[t.total_sell_transaction_amount < 0].groupby('user_id').size()
last['transaction_freq'] = buy.reindex(last.index, fill_value=0) + sell.reindex(last.index, fill_value=0)
eda = u.merge(last, on='user_id', validate='one_to_one')
assert len(eda) == 8277
numeric = ['user_age', 'last_amount_total', 'transaction_freq']
centered = eda[numeric].to_numpy() - eda[numeric].mean().to_numpy()
distance_sq = np.einsum('ij,jk,ik->i', centered, np.linalg.inv(np.cov(eda[numeric].to_numpy().T)), centered)
df = eda.loc[distance_sq <= chi2.ppf(.90, 3)].copy()
assert len(df) == 7667
income_map = {'< 10 Juta': 0, 'Rp 10 Juta - 50 Juta': 1, '> Rp 50 Juta - 100 Juta': 2, '> Rp 100 Juta - 500 Juta': 3, '> Rp 500 Juta - 1 Miliar': 4, '> Rp 1 Miliar': 5}
features = df[numeric].assign(income=df.user_income_range.map(income_map))
scaled = MinMaxScaler().fit_transform(features)
scaled[:, 3] *= 1.75
# Explicit n_init restores the historical default; squared distance restores the original cohort.
cluster_model = KMeans(n_clusters=4, random_state=10, n_init=10).fit(scaled)
df['segment'] = pd.Series(cluster_model.labels_, index=df.index).map({1: 'Newcomers', 3: 'Beginners', 2: 'Frequent users', 0: 'High-value users'})
names = ['Newcomers', 'Beginners', 'Frequent users', 'High-value users']
expected = [2798, 2347, 812, 1710]
assert df.groupby('segment').size().reindex(names).tolist() == expected
df = df.merge(c, on='user_id', validate='one_to_one')
assert df.churn.sum() == 3091
colors = ['#d83728', '#2864dc', '#d2a715', '#087f84']
wb = load_workbook(SOURCE / 'benefit_cost.xlsx', data_only=True)
segments = []
for i, name in enumerate(names):
    g = df[df.segment == name]
    w = wb.worksheets[i]
    segments.append(dict(id=i, name=name, color=colors[i], count=len(g), share=len(g)/len(df)*100,
        age=g.user_age.mean(), balance=g.last_amount_total.mean(), frequency=g.transaction_freq.mean(),
        buy=g.total_buy_amount.mean(), sell=g.total_sell_amount.abs().mean(), churnCount=int(g.churn.sum()), churn=g.churn.mean()*100,
        campaign=dict(target=w['C13'].value, risk=w['C14'].value, churn=w['C15'].value, cost=w['C18'].value,
            fee=w['C21'].value, transaction=w['C24'].value, multiplier=w['C25'].value, net=w['C28'].value)))

demographics = {}
for key, col, mapping in [
    ('Age', 'user_age', None),
    ('Occupation', 'user_occupation', {'Pelajar':'Student','Swasta':'Private-sector employee','Others':'Other','IRT':'Homemaker','Pengusaha':'Entrepreneur','PNS':'Civil servant','Guru':'Teacher','TNI/Polisi':'Military / police','Pensiunan':'Retired'}),
    ('Referral', 'referral_code_used', {'no referral':'No referral','used referral':'Used a referral'}),
    ('Income', 'user_income_range', {'< 10 Juta':'Below Rp10m','Rp 10 Juta - 50 Juta':'Rp10m-50m','> Rp 50 Juta - 100 Juta':'Rp50m-100m','> Rp 100 Juta - 500 Juta':'Rp100m-500m','> Rp 500 Juta - 1 Miliar':'Rp500m-1bn','> Rp 1 Miliar':'Above Rp1bn'})]:
    vals = pd.cut(eda[col], [15,25,40,60,100], labels=['15-25','26-40','41-60','61+'], include_lowest=True) if key == 'Age' else eda[col].map(mapping)
    counts = vals.value_counts(sort=False if key == 'Age' else True)
    demographics[key] = [dict(label=str(k), count=int(v), share=v/len(eda)*100) for k,v in counts.items()]

daily = t.groupby('date').agg(buy=('total_buy_transaction_amount','sum'), sell=('total_sell_transaction_amount','sum')).reset_index()
daily['sell'] = daily.sell.abs()
daily['date'] = pd.to_datetime(daily.date).dt.strftime('%Y-%m-%d')

# A new, explicitly labelled validation, not a claim to recover missing historical metrics.
model_df = df.copy()
model_df['registration_age'] = (pd.to_datetime(u.registration_import_datetime).max() + pd.Timedelta(days=1) - pd.to_datetime(model_df.registration_import_datetime)).dt.days
num = ['user_age','last_amount_total','total_buy_amount','total_sell_amount','registration_age']
cat = ['user_gender','referral_code_used','user_occupation','user_income_range','user_income_source','segment']
X, y = model_df[num+cat], model_df.churn
train, test = train_test_split(np.arange(len(df)), test_size=.2, random_state=42, stratify=y)
pre = ColumnTransformer([('numeric', StandardScaler(), num), ('category', OneHotEncoder(drop='first',handle_unknown='ignore',sparse_output=False), cat)])
model = make_pipeline(pre, LogisticRegression(class_weight='balanced',max_iter=2000,solver='lbfgs'))
model.fit(X.iloc[train],y.iloc[train])
prob = model.predict_proba(X.iloc[test])[:,1]
pred = (prob >= .5).astype(int)
thresholds = []
for threshold in np.linspace(.05,.95,19):
    p = (prob >= threshold).astype(int)
    thresholds.append(dict(threshold=round(threshold,2),matrix=confusion_matrix(y.iloc[test],p).tolist(),precision=precision_score(y.iloc[test],p,zero_division=0),recall=recall_score(y.iloc[test],p,zero_division=0),accuracy=accuracy_score(y.iloc[test],p)))
metrics = dict(n=len(test),train=len(train),accuracy=accuracy_score(y.iloc[test],pred),precision=precision_score(y.iloc[test],pred),recall=recall_score(y.iloc[test],pred),auc=roc_auc_score(y.iloc[test],prob),thresholds=thresholds,version=sklearn.__version__)

# Observed rates are descriptive; they are not fitted coefficients or causal effects.
signal_data = {}
for key, vals in [('Transaction activity',pd.cut(df.transaction_freq,[-1,0,1,3,100],labels=['No buy/sell days','1 buy/sell day','2-3 buy/sell days','4+ buy/sell days'])), ('Invested balance',pd.cut(df.last_amount_total,[-1,0,100000,1000000,float('inf')],labels=['Zero balance','Up to Rp100k','Rp100k-1m','Above Rp1m'])), ('Age',pd.cut(df.user_age,[15,25,40,60,100],labels=['15-25','26-40','41-60','61+'],include_lowest=True)), ('Referral',df.referral_code_used.map({'no referral':'No referral','used referral':'Used a referral'}))]:
    agg = df.assign(group=vals).groupby('group',observed=True).churn.agg(['size','sum','mean'])
    signal_data[key] = [dict(label=str(k),count=int(r['size']),churn=int(r['sum']),rate=r['mean']*100) for k,r in agg.iterrows()]

importance = []
encoder = model.named_steps['columntransformer']
coefs = model.named_steps['logisticregression'].coef_[0]
labels = ['Age','Invested balance','Total buy amount','Total sell amount (signed)','Time since registration']
for i,label in enumerate(labels):
    importance.append(dict(label=label,value=float(coefs[i]),kind='Numeric',basis='Per one standard deviation, with other inputs held fixed.'))
raw_names = encoder.get_feature_names_out()[len(num):]
for feature,coef in zip(raw_names,coefs[len(num):]):
    label = feature.replace('category__','')
    importance.append(dict(label=label,value=float(coef),kind='Category',basis='Relative to the omitted category, with other inputs held fixed.'))

demo_points,_ = make_blobs(n_samples=80,centers=[[.18,.23],[.30,.78],[.76,.25],[.77,.73]],cluster_std=.105,random_state=24)
demo_points = np.clip(demo_points, .025, .975)
demo = {}
seeds = np.array([[.15,.15],[.85,.85],[.15,.85],[.85,.15],[.5,.5]])
for k in [2,3,4,5]:
    frames = []
    for iteration in range(1,9):
        fit = KMeans(n_clusters=k,init=seeds[:k],n_init=1,max_iter=iteration,tol=0,random_state=10).fit(demo_points)
        frames.append(dict(centers=fit.cluster_centers_.round(5).tolist(),labels=fit.labels_.tolist(),inertia=fit.inertia_))
    demo[str(k)] = dict(initial=seeds[:k].tolist(),frames=frames)

result = dict(total=8277,segmented=7667,excluded=610,churn=3091,segments=segments,demographics=demographics,
    daily=daily.to_dict('records'),signals=signal_data,validation=metrics,coefficients=importance,
    demo=dict(points=demo_points.round(5).tolist(),runs=demo),
    sourceHashes={p:hashlib.sha256((SOURCE/p).read_bytes()).hexdigest() for p in ['python_users.xlsx','python_daily_user_transaction.xlsx','python_churn_users.xlsx','benefit_cost.xlsx']})
(OUT/'data.js').write_text('window.SEGMENTATION_DATA = '+json.dumps(result,separators=(',',':'),allow_nan=False)+';\n')
print(json.dumps(dict(segments=segments,validation=metrics,signals=signal_data),indent=2))
