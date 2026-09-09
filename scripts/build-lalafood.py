"""Build aggregate data and a standalone LalaFood story from analytical notebooks."""
import argparse
import html
import json
import re
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args = parser.parse_args()
out = ROOT / "assets/lalafood"
df = pd.read_csv(args.source / "cleaned_challenge_1.csv", low_memory=False)

def grouped(keys):
    frame = df.groupby(keys, observed=True)["booking_flag"].agg(["mean", "size", "sum"]).reset_index()
    return [{"label": " / ".join(str(row[k]).replace("_", " ") for k in keys),
             "rate": round(row["mean"]*100, 6), "share": round(row["size"]/len(df)*100, 6),
             "count": int(row["size"]), "bookings": int(row["sum"])} for _, row in frame.iterrows()]

df["distance_bin"] = pd.cut(df.distance_from_user, [0,2,5,10,float("inf")], labels=["0-2 km","2-5 km","5-10 km","10+ km"], include_lowest=True)
df["rating_bin"] = pd.cut(df.restaurant_rating, [0,3,4,5], labels=["0-3","3-4","4-5"], include_lowest=True)
df["review_bin"] = pd.cut(df.rating_count, [0,10,50,100,float("inf")], labels=["0-10","10-50","50-100","100+"], include_lowest=True)
df["price_bin"] = pd.cut(df.median_merchant_price_bucket, list(range(0,150001,10000))+[float("inf")], labels=[f"{i}-{i+10}k" for i in range(0,150,10)]+[">150k"], include_lowest=True)
nb = json.loads((args.source/"customer_eda.ipynb").read_text())
cohort_text = "\n".join("".join(o.get("data",{}).get("text/plain",[])) for o in nb["cells"][27]["outputs"])
cohorts=[]
for line in cohort_text.splitlines():
    match = re.match(r"\s*\d+\s+(\d{4}-\d{2})-01\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)",line)
    if match:
        month,age,size,active,rate=match.groups()
        cohorts.append(dict(month=month,age=int(age),size=int(size),active=int(active),rate=float(rate)))
assert len(cohorts)==55

# Read numerical SHAP output directly; no reconstruction from an image.
model_nb=json.loads((args.source/"statistical_modeling.ipynb").read_text())
shap_text="\n".join("".join(o.get("text",[])) for o in model_nb["cells"][36]["outputs"])
features={
 44:("Co-branding activity","Restaurant","Higher activity is associated with stronger booking predictions. This is the strongest signal in the model.","Higher activity favors booking"),
 30:("RPL & MFP promotions","Promotion","Availability of this promotion type is associated with a higher predicted likelihood of booking.","Presence favors booking"),
 35:("Promotion visibility","Promotion","Showing an offer is associated with a higher predicted likelihood of booking. An available offer must also be visible.","Visibility favors booking"),
 34:("Distance to restaurant","Restaurant","Longer distances tend to reduce predicted booking likelihood, consistent with the conversion pattern across distance bands.","Greater distance discourages booking"),
 32:("Customer segment","Customer","The model distinguishes patterns across customer segments. Average influence does not imply a single direction for every segment.","Direction varies by segment"),
 28:("Unmanaged small business","Restaurant","Whether the restaurant is an unmanaged small business. This value measures influence size, not a universal positive or negative effect.","Influence magnitude"),
 27:("Managed small business","Restaurant","Whether the restaurant is a managed small business. Its average influence is smaller than co-branding and promotions.","Influence magnitude"),
 39:("Number of reviews","Restaurant","Review count contributes to predictions alongside ratings and other restaurant characteristics.","Influence magnitude"),
 43:("Restaurant price","Restaurant","Typical restaurant price contributes to the prediction. Its effect can differ across customers and price ranges.","Direction varies by context"),
 6:("Rice dishes","Cuisine","Whether the restaurant's primary cuisine is Aneka Nasi. Cuisine adds a smaller signal than the leading promotion and co-branding features.","Influence magnitude")}
shap=[]
for line in shap_text.splitlines():
    match=re.match(r"\s*(\d+)\s+(.+?)\s+([\d.]+)\s*$",line)
    if match and int(match[1]) in features:
        index=int(match[1]);label,category,description,direction=features[index]
        shap.append(dict(id=str(index),label=label,category=category,value=float(match[3]),description=description,direction=direction))
assert len(shap)==10 and shap[0]["value"]==2.429226
data=dict(sessions=len(df),segment=grouped(["customer_segmentation"]),cuisine=grouped(["primary_cuisine_name"]),
    time=grouped(["food_time_detail","day_session"]),rating=grouped(["rating_bin","review_bin"]),price=grouped(["price_bin"]),
    promo=grouped(["promo_availability","promo_show"]),visibility=grouped(["promo_show"]),membership=grouped(["customer_gojekplus"]),
    distance=grouped(["distance_bin"]),
    cohorts=cohorts,shap=shap,models=[dict(label="Logistic regression",accuracy=.7811,precision=.6922,recall=.2252),dict(label="Initial XGBoost",accuracy=.8205,precision=.6176,recall=.7414),dict(label="Tuned XGBoost",accuracy=.8230,precision=.6198,recall=.7562)])
(out/"data.js").write_text("window.LALAFOOD_DATA = "+json.dumps(data,ensure_ascii=True)+";\n")
story=json.loads((ROOT/"scripts/lalafood-story.json").read_text())
articles=[]
for i,section in enumerate(story):
    sid=section["id"]
    paragraphs="".join("<p>"+p+"</p>" for p in section["paragraphs"])
    articles.append(f'''<section class="story-step" id="section-{sid}" data-viz="{sid}" aria-labelledby="heading-{sid}">
      <div class="step-copy"><div class="eyebrow">{section['chapter']} <span>{i+1:02} / {len(story):02}</span></div>
      <h2 id="heading-{sid}">{section['title']}</h2>{paragraphs}
      <p class="takeaway">{section['takeaway']}</p></div><div class="mobile-viz-slot"></div>
    </section>''')
nav="".join(f'<a href="#section-{s["id"]}" data-section="{s["id"]}"><span>{i+1:02}</span>{html.escape(s["nav"])}</a>' for i,s in enumerate(story))
template=(ROOT/"scripts/lalafood-template.html").read_text()
(ROOT/"projects/lalafood/index.html").write_text(template.replace("<!-- ARTICLE -->","\n".join(articles)).replace("<!-- CONTENTS -->",nav))
print(f"Built {len(story)} story sections, {len(shap)} numerical SHAP features, and {len(cohorts)} cohort observations.")
