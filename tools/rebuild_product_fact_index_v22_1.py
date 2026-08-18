import json,re,math,collections
from pathlib import Path
root=Path(__file__).resolve().parent
kdir=root/'knowledge'
d=json.load(open(kdir/'MIG_FARM_PRODUCT_DOSSIERS_V20.json',encoding='utf-8'))
products=d['products']

def norm(s):
    s=str(s or '').lower().translate(str.maketrans({'أ':'ا','إ':'ا','آ':'ا','ة':'ه','ى':'ي','ؤ':'و','ئ':'ي','ـ':' '}))
    s=re.sub(r'[^\w%+./×*\-\"]+',' ',s,flags=re.UNICODE)
    return re.sub(r'\s+',' ',s).strip()
def arr(v): return v if isinstance(v,list) else []
stop=set(norm('the and for with from this that product products use used using suitable according follow manufacturer recommended category agriculture agricultural farm farms garden gardens plant plants item component system systems ضمن منتج فئة للاستخدام استخدام مناسب حسب يجب يتم يمكن على في من الى إلى او أو مع هذا هذه التي الذي عند عن يتم زراعي زراعية الزراعة المزارع الحدائق النبات المحصول المنتج').split())
def tokens(text): return [t for t in norm(text).split() if len(t)>2 and t not in stop and not t.isdigit()]

spec_patterns=[
 ('power_hp',re.compile(r'\b\d+(?:\.\d+)?\s*(?:hp|h\.p)\b',re.I)),
 ('power_w',re.compile(r'\b\d+(?:\.\d+)?\s*(?:w|watt|watts)\b',re.I)),
 ('voltage',re.compile(r'\b\d+(?:\.\d+)?\s*(?:v|volt|volts)\b',re.I)),
 ('flow',re.compile(r'\b\d+(?:\.\d+)?\s*(?:l\s*/\s*h|l/h|lph|ltr/h|liter/hour|litre/hour)\b',re.I)),
 ('length',re.compile(r'\b\d+(?:\.\d+)?\s*(?:mm|cm|meter|meters|metre|metres|m)\b',re.I)),
 ('weight',re.compile(r'\b\d+(?:\.\d+)?\s*(?:kg|g|gm|gram|grams)\b',re.I)),
 ('volume',re.compile(r'\b\d+(?:\.\d+)?\s*(?:ml|ltr|liter|litre|liters|litres|l)\b',re.I)),
 ('seed_count',re.compile(r'\b\d[\d,]*(?:\s*)(?:seed|seeds|بذره|بذرة)\b',re.I)),
 ('percentage',re.compile(r'\b\d+(?:\.\d+)?\s*%\b',re.I)),
 ('layers',re.compile(r'\b\d+\s*(?:layer|layers|طبقه|طبقات)\b',re.I)),
 ('npk',re.compile(r'\b\d{1,2}\s*[-–]\s*\d{1,2}\s*[-–]\s*\d{1,2}(?:\s*\+\s*[A-Za-z0-9%]+)?\b',re.I)),
 ('thread_size',re.compile(r'\b\d+(?:/\d+)?\s*(?:inch|inches|\")\b',re.I)),
]
labels=['Active Ingredient','Target Pests','Warranty','Material','Capacity','Pressure','Flow Rate','Voltage','Power','Size','Dimensions','المادة الفعالة','السعة','القدرة','الضغط','المقاس']
BAD_LABEL=re.compile(r'(requirement|compatibility stated|according to|follow the|recommended|before installation|وفق اسم|حسب متطلبات|تأكد من|الموصى)',re.I)

def desc_sources(p):
    prov=p.get('descriptions',{}).get('provenance','')
    name=str(p.get('name',''))
    if prov=='generated_202':
        tax=p.get('taxonomy',{})
        safe=' '.join([name,str(p.get('sku','')),str(tax.get('tags_raw','')),' '.join(arr(tax.get('feature')))])
        return safe,'name_taxonomy_only_generated_description_excluded'
    txt=' '.join([name,p.get('descriptions',{}).get('sales_exact',''),p.get('descriptions',{}).get('ecommerce_text_exact','')])
    return txt,'stored_original_product_text'

def explicit_facts(p):
    txt,scope=desc_sources(p);facts=[];seen=set()
    for kind,pat in spec_patterns:
        for m in pat.finditer(txt):
            val=re.sub(r'\s+',' ',m.group(0)).strip();key=(kind,val.lower())
            if key in seen: continue
            seen.add(key)
            a=max(0,m.start()-45);b=min(len(txt),m.end()+65)
            ctx=re.sub(r'\s+',' ',txt[a:b]).strip()
            facts.append({'kind':kind,'value':val,'evidence':'explicit_text_match','source_scope':scope,'context':ctx[:180]})
            if len(facts)>=28: break
    if scope=='stored_original_product_text':
        for label in labels:
            pat=re.compile(r'(?:^|[\n\r])?'+re.escape(label)+r'\s*[:：]\s*([^\n.;]{2,180})',re.I)
            for m in pat.finditer(txt):
                value=re.sub(r'\s+',' ',m.group(1)).strip()
                if BAD_LABEL.search(value): continue
                key=('label',norm(label+value))
                if key in seen: continue
                seen.add(key);facts.append({'kind':'labelled_fact','label':label,'value':value,'evidence':'explicit_label_text','source_scope':scope})
                break
    return facts[:32]

DF=collections.Counter(); docs={}
for p in products:
    text=' '.join([p.get('name',''),p.get('sku',''),p.get('taxonomy',{}).get('category',''),p.get('taxonomy',{}).get('tags_raw','')])
    # Original descriptions improve need matching. Generic generated copy is excluded from IDF.
    if p.get('descriptions',{}).get('provenance')!='generated_202': text+=' '+p.get('descriptions',{}).get('sales_exact','')
    ts=tokens(text);docs[p['external_id']]=ts;DF.update(set(ts))
N=len(products)
def keyterms(pid,limit=30):
    tf=collections.Counter(docs[pid]);vals=[]
    for t,c in tf.items(): vals.append((c*(math.log((N+1)/(DF[t]+1))+1),t))
    return [t for _,t in sorted(vals,reverse=True)[:limit]]

out={'version':'22.1','name':'MIG FARM Product Fact & Need Index — Reliability Hotfix','policy':{
 'facts':'Only explicit text matches. Generated completion copy is excluded from technical-fact extraction; only its name/taxonomy may yield facts.',
 'labelled_facts':'Require an explicit colon and reject generic instruction/template phrases.',
 'price_stock':'Current price/availability require live Odoo.',
 'compatibility':'No compatibility is inferred from category proximity.'},'stats':{},'products':[]}
for p in products:
    prov=p.get('descriptions',{}).get('provenance','')
    out['products'].append({'external_id':p['external_id'],'name':p.get('name',''),'sku':p.get('sku',''),'category':p.get('taxonomy',{}).get('category',''),'type':arr(p.get('taxonomy',{}).get('type')),'supplier':arr(p.get('taxonomy',{}).get('supplier')),'features':arr(p.get('taxonomy',{}).get('feature')),'description_provenance':prov,'description_reliability':'stored_original_catalog_text' if prov!='generated_202' else 'generated_catalog_copy_not_technical_spec','need_terms':keyterms(p['external_id']),'explicit_facts':explicit_facts(p),'field_provenance':{'name':'odoo_catalog_dossier_v20','sku':'odoo_catalog_dossier_v20','taxonomy':'odoo_taxonomy_files','description':prov or 'unknown','current_price':'live_odoo_required','current_availability':'live_odoo_required'}})
out['stats']={'products':len(out['products']),'explicit_facts':sum(len(x['explicit_facts']) for x in out['products']),'need_terms':sum(len(x['need_terms']) for x in out['products']),'generated_descriptions_excluded_from_technical_fact_extraction':sum(x['description_provenance']=='generated_202' for x in out['products'])}
json.dump(out,open(kdir/'MIG_FARM_PRODUCT_FACT_INDEX_V21.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
# synchronize visual signatures with cleaned facts
sp=kdir/'MIG_FARM_VISUAL_PRODUCT_SIGNATURES_V22.json';sig=json.load(open(sp,encoding='utf-8'));by={x['external_id']:x for x in out['products']}
for r in sig.get('products',[]):
    f=by.get(r.get('external_id'),{});r['explicit_facts']=f.get('explicit_facts',[]);r['description_provenance']=f.get('description_provenance','');r['description_reliability']=f.get('description_reliability','')
sig['version']='22.1';sig['name']='MIG FARM Visual Product Signatures — Reliability Hotfix';sig['stats']['explicit_facts']=out['stats']['explicit_facts'];sig['fact_reliability_policy']='Generated completion descriptions are not used as technical specification evidence.'
json.dump(sig,open(sp,'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print(out['stats'])
