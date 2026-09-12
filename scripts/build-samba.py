"""Build privacy-preserving Samba aggregates and extract unmodified dashboard images.

Import: python scripts/build-samba.py --workbook PATH --dashboards
Rebuild offline: python scripts/build-samba.py
Only aggregate counts are published; no customer, seller, order IDs or coordinates.
"""
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/samba-source.json'
OUT = ROOT / 'assets/samba'
parser = argparse.ArgumentParser()
parser.add_argument('--workbook')
parser.add_argument('--dashboards', action='store_true')
args = parser.parse_args()
OUT.mkdir(parents=True, exist_ok=True)

def summarize(rows):
    return dict(orders=len(rows), customers=len({r['customer id'] for r in rows}),
                sellers=len({r['seller_id'] for r in rows}),
                paymentCents=sum(r['cents'] for r in rows),
                items=sum(r['qty_item'] for r in rows))

def groups(rows, key):
    result = defaultdict(list)
    for row in rows:
        result[row[key]].append(row)
    return [dict(name=k, **summarize(v)) for k, v in sorted(result.items())]

if args.workbook:
    import openpyxl
    book = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True)
    tables = {}
    for name, width in [('Orders', 10), ('Order History', 5), ('Payments', 4)]:
        values = book[name].iter_rows(values_only=True)
        headers = next(values)[:width]
        rows = [dict(zip(headers, row[:width])) for row in values if row[0] is not None]
        tables[name] = {r['order_id']: r for r in rows}
        assert len(rows) == len(tables[name]) == 49544, (name, 'duplicate/missing rows')
    keys = set(tables['Orders'])
    assert all(set(t) == keys for t in tables.values()), 'Incomplete join coverage'
    joined = []
    for oid, order in tables['Orders'].items():
        r = dict(order, **{k:v for k,v in tables['Payments'][oid].items() if k != 'order_id'})
        r['month'] = tables['Order History'][oid]['order_purchase_timestamp'].strftime('%Y-%m')
        r['city_state'] = r['customer_city'] + ', ' + r['customer_state']
        r['cents'] = round(r['total_payment_value'] * 100)
        assert r['order_status'] == 'Delivered'
        assert isinstance(r['qty_item'], (int, float)) and r['qty_item'] > 0, repr(r['qty_item'])
        joined.append(r)
    frozen = dict(
        source='https://docs.google.com/spreadsheets/d/1xZB2-ewh_7bttXtbVgumHCuqRilUROKUWRGKF-Ao_wQ/edit',
        exportDate='2026-09-09',
        workbookSha256=hashlib.sha256(Path(args.workbook).read_bytes()).hexdigest(),
        period=['2021-01', '2022-01'], currency='Source $ units; no currency conversion',
        summary=summarize(joined), months=groups(joined, 'month'),
        states=groups(joined, 'customer_state'), cities=groups(joined, 'city_state'),
        categories=groups(joined, 'product_category_name'),
        join=dict(tables=list(tables), rowsPerTable=49544, uniqueOrderKeys=49544, unmatchedOrders=0),
    )
    SOURCE.write_text(json.dumps(frozen, separators=(',', ':'), allow_nan=False) + '\n')
    book.close()

data = json.loads(SOURCE.read_text())
assert data['summary']['orders'] == 49544
assert data['summary']['customers'] == 48022
assert data['summary']['sellers'] == 1771
assert data['summary']['paymentCents'] == 781287264
assert len(data['months']) == 13
for key in ['months', 'states', 'cities', 'categories']:
    for measure in ['orders', 'paymentCents', 'items']:
        assert sum(r[measure] for r in data[key]) == data['summary'][measure], (key, measure)
(OUT/'data.js').write_text('window.SAMBA_DATA = ' + json.dumps(data, separators=(',', ':'), allow_nan=False) + ';\n')

if args.dashboards:
    from pypdf import PdfReader
    reader = PdfReader(ROOT/'deck/Executive Dashboard_Samba E-Commerce.pdf')
    for index, name in [(5, 'looker-dashboard.jpg'), (11, 'tableau-dashboard.jpg')]:
        images = list(reader.pages[index].images)
        assert len(images) == 1
        (OUT/name).write_bytes(images[0].data)
print(f"PASS: {data['summary']['orders']:,} one-to-one joined orders; 13 months; four grouping totals reconcile.")
print('Dashboard images extracted unchanged.' if args.dashboards else 'Offline aggregate rebuild complete.')
