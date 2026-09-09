"""Verify story data, accessible document structure, and local links."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re

ROOT=Path(__file__).resolve().parents[1]
article=ROOT/"projects/lalafood/index.html"
class Document(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.links=[]; self.text=[]; self.sections=[]; self.stack=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if "id" in a:self.ids.append(a["id"])
        if "data-viz" in a:self.sections.append(a["data-viz"])
        self.links.extend(a[k] for k in ["src","href"] if k in a)
        if tag not in ["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]:self.stack.append(tag)
    def handle_endtag(self,tag):
        assert self.stack and self.stack[-1]==tag,(tag,self.stack[-5:])
        self.stack.pop()
    def handle_data(self,text):self.text.append(text)

parser=Document();parser.feed(article.read_text())
assert not parser.stack
assert len(parser.sections)==9
assert len(parser.ids)==len(set(parser.ids))
assert not re.search(r"\b(pdf|slide|slides)\b", " ".join(parser.text), re.I)
for url in parser.links:
    p=urlsplit(url)
    assert '.pdf' not in p.path.lower()
    if not p.scheme and p.path:assert (article.parent/unquote(p.path)).is_file(),url
    elif not p.scheme and p.fragment:assert p.fragment in parser.ids,url
data=json.loads((ROOT/"assets/lalafood/data.js").read_text().removeprefix("window.LALAFOOD_DATA = ").removesuffix(";\n"))
assert 'pages' not in data
assert len(data['cohorts'])==55
assert sum(d['count'] for d in data['segment'])==329590
assert len(data['shap'])==10
assert [d['value'] for d in data['shap']]==[2.429226,.319815,.165997,.122085,.094553,.069467,.061385,.048872,.044059,.043988]
assert data['models'][2]['recall']==.7562
assert all(0<=d['rate']<=100 for d in data['cohorts'])
story=json.loads((ROOT/'scripts/lalafood-story.json').read_text())
words=len(re.sub('<[^>]+>','',' '.join(' '.join(s['paragraphs'])+' '+s['takeaway'] for s in story)).split())
assert words<1000,words
print(f'PASS: 9 sections, {words} narrative words, 10 exact SHAP scores, 55 cohort observations, valid HTML, all local links; no PDF references.')
