import crypto from "crypto";

const BASE_URL = "https://noon-api-gateway.noon.partners";
const USER_AGENT = "MIGFARM-Noon-Manager/1.0";

class NoonApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = "NoonApiError";
    this.status = status;
    this.details = details;
  }
}

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`missing_env:${name}`);
  return value;
}

function optionalEnv(name) {
  return String(process.env[name] || "").trim();
}

function normalizePrivateKey(value) {
  let key = String(value || "").trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function createJwt() {
  const keyId = requiredEnv("NOON_KEY_ID");
  const privateKey = normalizePrivateKey(requiredEnv("NOON_PRIVATE_KEY"));

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: keyId,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(),
    }),
  );

  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    privateKey,
  );

  return `${signingInput}.${base64url(signature)}`;
}

function getCookieHeader(response) {
  const setCookieHeaders =
    response.headers.getSetCookie?.() ||
    [response.headers.get("set-cookie")].filter(Boolean);

  return setCookieHeaders.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function authenticate() {
  const projectCode = requiredEnv("NOON_PROJECT_CODE");

  const response = await fetch(`${BASE_URL}/identity/public/v1/api/login`, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: createJwt(),
      default_project_code: projectCode,
    }),
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new NoonApiError(
      `noon_login_failed:${response.status}`,
      response.status,
      text.slice(0, 1000),
    );
  }

  const cookie = getCookieHeader(response);
  if (!cookie) {
    throw new NoonApiError("noon_login_failed:no_session_cookie", 502);
  }

  return { cookie, projectCode };
}

async function noonPost(path, body = {}, options = {}) {
  const { cookie, projectCode } = await authenticate();

  const headers = {
    "User-Agent": USER_AGENT,
    "Content-Type": "application/json",
    Cookie: cookie,
  };

  if (options.projectHeader !== false) {
    headers["X-Project"] = projectCode;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 4000) };
  }

  if (!response.ok) {
    throw new NoonApiError(
      `noon_api_failed:${response.status}`,
      response.status,
      data,
    );
  }

  return data;
}

function getActionToken() {
  return optionalEnv("NOON_ACTION_TOKEN") || optionalEnv("MIG_ADMIN_TOKEN");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}


const UI_COOKIE = "mig_noon_ui";
const UI_SESSION_SECONDS = 8 * 60 * 60;

function uiSignature(payload) {
  return crypto
    .createHmac("sha256", getActionToken())
    .update(String(payload))
    .digest("base64url");
}

function createUiSession(candidate) {
  const expected = getActionToken();
  if (!expected || !safeEqual(candidate, expected)) return null;
  const issued = Math.floor(Date.now() / 1000);
  const expires = issued + UI_SESSION_SECONDS;
  const nonce = crypto.randomBytes(12).toString("base64url");
  const payload = `${issued}.${expires}.${nonce}`;
  const value = `${payload}.${uiSignature(payload)}`;
  return {
    expires,
    cookie: `${UI_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${UI_SESSION_SECONDS}`,
  };
}

function getCookie(request, name) {
  const raw = String(request.headers.get("cookie") || "");
  for (const item of raw.split(";")) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

function hasValidUiSession(request) {
  const value = getCookie(request, UI_COOKIE);
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  const [issued, expires, nonce, signature] = parts;
  if (!/^\d+$/.test(expires)) return false;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const payload = `${issued}.${expires}.${nonce}`;
  return safeEqual(signature, uiSignature(payload));
}

function sameOrigin(request) {
  const fetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return false;
  const origin = String(request.headers.get("origin") || "");
  const host = String(request.headers.get("host") || "");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function requireAuthorized(request) {
  if (hasValidUiSession(request)) return;

  const expected = getActionToken();
  if (!expected) {
    throw new NoonApiError(
      "write_api_locked: set NOON_ACTION_TOKEN in Vercel",
      503,
    );
  }

  const auth = String(request.headers.get("authorization") || "");
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const alt = String(request.headers.get("x-noon-action-token") || "").trim();
  const supplied = bearer || alt;

  if (!supplied || !safeEqual(supplied, expected)) {
    throw new NoonApiError("unauthorized", 401);
  }
}

function ensureString(value, field) {
  if (!String(value || "").trim()) {
    throw new NoonApiError(`missing_field:${field}`, 400);
  }
  return String(value).trim();
}

function ensureNumber(value, field, { min = null } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new NoonApiError(`invalid_number:${field}`, 400);
  }
  if (min !== null && n < min) {
    throw new NoonApiError(`invalid_number:${field}`, 400);
  }
  return n;
}

function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  );
}

function buildProductPayload(input = {}) {
  const partnerSku =
    input.partner_sku ||
    input.partnerSku ||
    input.skus?.[0]?.partner_sku;

  const skus = Array.isArray(input.skus) && input.skus.length
    ? input.skus
    : [{ partner_sku: ensureString(partnerSku, "partner_sku") }];

  for (const sku of skus) {
    ensureString(sku.partner_sku, "skus[].partner_sku");
  }

  const attributes = { ...(input.attributes || {}) };

  if (!attributes.product_title && (input.title_en || input.title_ar)) {
    const values = [];
    if (input.title_en) {
      values.push({ value: String(input.title_en), language: "LANGUAGE_EN" });
    }
    if (input.title_ar) {
      values.push({ value: String(input.title_ar), language: "LANGUAGE_AR" });
    }
    attributes.product_title = { values };
  }

  if (
    !attributes.long_description &&
    (input.description_en || input.description_ar)
  ) {
    const values = [];
    if (input.description_en) {
      values.push({
        value: String(input.description_en),
        language: "LANGUAGE_EN",
      });
    }
    if (input.description_ar) {
      values.push({
        value: String(input.description_ar),
        language: "LANGUAGE_AR",
      });
    }
    attributes.long_description = { values };
  }

  if (!attributes.feature_bullet && Array.isArray(input.features_en)) {
    const values = input.features_en.map((value, index) => ({
      value: String(value),
      language: "LANGUAGE_EN",
      sort: index + 1,
    }));

    if (Array.isArray(input.features_ar)) {
      values.push(
        ...input.features_ar.map((value, index) => ({
          value: String(value),
          language: "LANGUAGE_AR",
          sort: index + 1,
        })),
      );
    }
    attributes.feature_bullet = { values };
  }

  const images = (input.images || []).map((item, index) => {
    if (typeof item === "string") {
      return { url: item, sort: index + 1 };
    }
    return {
      url: ensureString(item.url, "images[].url"),
      sort: item.sort ?? index + 1,
    };
  });

  return compactObject({
    skus,
    brand: ensureString(input.brand, "brand"),
    category: ensureString(input.category, "category"),
    images,
    attributes,
  });
}

function partnerSkuFromProduct(product) {
  return product?.partner_sku ||
    product?.partnerSku ||
    product?.skus?.[0]?.partner_sku ||
    null;
}

function summarizeContent(content) {
  const statuses = Array.isArray(content?.statuses) ? content.statuses : [];
  const live =
    statuses.length > 0 &&
    statuses.every((s) => s?.overall_status === "OVERALL_STATUS_ACTIVE");

  const completeness = statuses.map((s) => ({
    language: s?.language,
    completeness: s?.content?.completeness,
    missing_attributes: s?.content?.missing_attributes || [],
    invalid_attributes: s?.content?.invalid_attributes || [],
    qc_status: s?.qc?.status,
    rejection_reasons: s?.qc?.rejection_reasons || [],
    overall_status: s?.overall_status,
  }));

  const imageIssues = (content?.images || [])
    .filter(
      (img) =>
        img?.review_status === "REVIEW_STATUS_INVALID" ||
        (Array.isArray(img?.issues) && img.issues.length),
    )
    .map((img) => ({
      url: img?.url,
      review_status: img?.review_status,
      visibility: img?.visibility,
      issues: img?.issues || [],
    }));

  return { live, completeness, image_issues: imageIssues };
}

async function actionListCategories(body) {
  return noonPost("/content/v1/categories/list", body?.request || {});
}

async function actionCategoryAttributes(body) {
  const category = ensureString(body?.category, "category");
  return noonPost("/content/v1/categories/attributes/list", { category });
}

async function actionUpsertProduct(body) {
  const product = buildProductPayload(body?.product || body);
  const result = await noonPost("/content/v1/product/upsert", product);

  let content = null;
  if (result?.sku_parent) {
    content = await noonPost("/content/v1/product/content/get", {
      sku_parent: result.sku_parent,
    });
  }

  return {
    upsert: result,
    content,
    summary: content ? summarizeContent(content) : null,
  };
}

async function actionGetContent(body) {
  const skuParent = ensureString(body?.sku_parent, "sku_parent");
  const content = await noonPost("/content/v1/product/content/get", {
    sku_parent: skuParent,
  });
  return { content, summary: summarizeContent(content) };
}

async function actionSetPrice(body) {
  const item = compactObject({
    partner_sku: ensureString(body?.partner_sku, "partner_sku"),
    country_code: String(body?.country_code || "ae").toLowerCase(),
    price:
      body?.price === undefined ? undefined : ensureNumber(body.price, "price", { min: 0 }),
    msrp:
      body?.msrp === undefined ? undefined : ensureNumber(body.msrp, "msrp", { min: 0 }),
    is_active:
      body?.is_active === undefined ? undefined : Boolean(body.is_active),
  });

  return noonPost("/pricing/v1/pricing/upsert", { items: [item] });
}

async function actionGetPrice(body) {
  const item = {
    partner_sku: ensureString(body?.partner_sku, "partner_sku"),
    country_code: String(body?.country_code || "ae").toLowerCase(),
  };

  return noonPost("/pricing/v1/pricing/get", { items: [item] });
}

async function actionSetStock(body) {
  const warehouseCode =
    body?.warehouse_code || optionalEnv("NOON_WAREHOUSE_CODE");

  const item = compactObject({
    warehouse_code: ensureString(warehouseCode, "warehouse_code"),
    partner_sku: ensureString(body?.partner_sku, "partner_sku"),
    qty: ensureNumber(body?.qty, "qty", { min: 0 }),
    processing_time: body?.processing_time
      ? String(body.processing_time)
      : undefined,
  });

  return noonPost("/stock/v1/stock-update", { items: [item] });
}

async function actionCreateAndPublish(body) {
  const productInput = body?.product || {};
  const productPayload = buildProductPayload(productInput);
  const partnerSku = ensureString(
    body?.partner_sku || partnerSkuFromProduct(productInput),
    "partner_sku",
  );

  const upsert = await noonPost(
    "/content/v1/product/upsert",
    productPayload,
  );

  if (!upsert?.sku_parent) {
    return {
      ok: false,
      stage: "content",
      upsert,
      message:
        "Product submission did not return sku_parent. Pricing and stock were not changed.",
    };
  }

  const results = { upsert };

  if (body?.price !== undefined || body?.pricing) {
    const pricing = body?.pricing || {};
    const price =
      pricing.price !== undefined ? pricing.price : body.price;
    const msrp =
      pricing.msrp !== undefined ? pricing.msrp : body.msrp;
    const countryCode =
      pricing.country_code || body.country_code || "ae";

    results.pricing = await actionSetPrice({
      partner_sku: partnerSku,
      country_code: countryCode,
      price,
      msrp,
      is_active: Boolean(body?.activate ?? pricing?.is_active ?? true),
    });
  }

  const stockInput = body?.stock || {};
  const wantsStock =
    stockInput.qty !== undefined ||
    body?.qty !== undefined ||
    stockInput.warehouse_code ||
    body?.warehouse_code ||
    optionalEnv("NOON_WAREHOUSE_CODE");

  if (wantsStock && (stockInput.qty !== undefined || body?.qty !== undefined)) {
    results.stock = await actionSetStock({
      partner_sku: partnerSku,
      warehouse_code:
        stockInput.warehouse_code ||
        body?.warehouse_code ||
        optionalEnv("NOON_WAREHOUSE_CODE"),
      qty:
        stockInput.qty !== undefined ? stockInput.qty : body.qty,
      processing_time:
        stockInput.processing_time || body.processing_time,
    });
  }

  results.content = await noonPost(
    "/content/v1/product/content/get",
    { sku_parent: upsert.sku_parent },
  );

  results.summary = summarizeContent(results.content);
  results.activation_requested = Boolean(
    body?.activate ??
      body?.pricing?.is_active ??
      (body?.price !== undefined || body?.pricing),
  );

  results.message = results.summary.live
    ? "Product is live on noon."
    : "Product was submitted. It is not confirmed live yet; check completeness, image review and QC in summary.";

  return results;
}

async function dispatch(action, body) {
  switch (action) {
    case "list_categories":
      return actionListCategories(body);
    case "category_attributes":
      return actionCategoryAttributes(body);
    case "upsert_product":
      return actionUpsertProduct(body);
    case "get_content":
      return actionGetContent(body);
    case "set_price":
      return actionSetPrice(body);
    case "get_price":
      return actionGetPrice(body);
    case "set_stock":
      return actionSetStock(body);
    case "create_and_publish":
      return actionCreateAndPublish(body);
    default:
      throw new NoonApiError(`unsupported_action:${action}`, 400);
  }
}


function htmlResponse(content, status = 200, extraHeaders = {}) {
  return new Response(content, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      ...extraHeaders,
    },
  });
}

function loginPage() {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MIG FARM Noon Uploader</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#f4f7f4;color:#17301d}
.wrap{min-height:100vh;display:grid;place-items:center;padding:24px}.box{width:min(460px,100%);background:#fff;border:1px solid #dfe8df;border-radius:20px;padding:28px;box-shadow:0 18px 50px #17301d14}
h1{margin:0 0 8px;font-size:26px;color:#174b2a}.sub{color:#66756a;margin-bottom:24px;line-height:1.6}
label{display:block;font-weight:700;margin-bottom:8px}input{width:100%;padding:13px 14px;border:1px solid #ccd8ce;border-radius:12px;font-size:16px}
button{width:100%;margin-top:14px;padding:13px 16px;border:0;border-radius:12px;background:#174b2a;color:#fff;font-weight:800;font-size:16px;cursor:pointer}
.err{display:none;margin-top:12px;color:#a52a2a;font-size:14px}
small{display:block;color:#7a887d;margin-top:14px;line-height:1.5}
</style>
</head>
<body><div class="wrap"><div class="box">
<h1>MIG FARM — Noon Uploader</h1>
<div class="sub">دخول خاص لإدارة منتجات نون.</div>
<form id="login">
<label>رمز الدخول</label>
<input id="token" type="password" autocomplete="current-password" required>
<button type="submit">دخول</button>
<div class="err" id="err">رمز الدخول غير صحيح.</div>
</form>
<small>يتم حفظ جلسة آمنة في Cookie ولا يظهر الرمز داخل الصفحة بعد تسجيل الدخول.</small>
</div></div>
<script>
document.getElementById('login').addEventListener('submit',async(e)=>{
 e.preventDefault(); const err=document.getElementById('err'); err.style.display='none';
 const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ui_login',token:document.getElementById('token').value})});
 if(r.ok){location.reload();}else{err.style.display='block';}
});
</script>
</body></html>`;
}

function appPage() {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MIG FARM Noon Uploader</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#f5f7f4;color:#183321}
header{background:#123f25;color:#fff;padding:18px 22px;position:sticky;top:0;z-index:3}
header .row{max-width:1100px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:12px}
header h1{margin:0;font-size:21px}header button{background:#fff1;border:1px solid #ffffff55;color:#fff;padding:8px 12px;border-radius:10px;cursor:pointer}
main{max-width:1100px;margin:24px auto;padding:0 16px 50px}.panel{background:#fff;border:1px solid #dfe7df;border-radius:18px;padding:20px;box-shadow:0 8px 28px #153e2210}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.full{grid-column:1/-1}
label{display:block;font-weight:800;font-size:14px;margin-bottom:7px}.hint{font-weight:400;color:#7a887e}
input,textarea,select{width:100%;border:1px solid #cfd9d0;border-radius:11px;padding:11px 12px;font:inherit;background:#fff}textarea{min-height:90px;resize:vertical}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.btn{border:0;border-radius:11px;padding:11px 16px;font-weight:800;cursor:pointer}.primary{background:#176237;color:#fff}.secondary{background:#eef4ef;color:#174b2a}.danger{background:#fff0f0;color:#9a2929}
.status{margin-top:18px;border-radius:12px;padding:14px;display:none;white-space:pre-wrap;direction:ltr;text-align:left;font-family:Consolas,monospace;font-size:13px;overflow:auto;max-height:460px}.ok{background:#edf8f0;border:1px solid #bddfc4}.bad{background:#fff1f1;border:1px solid #ecc1c1}
.topnote{margin-bottom:16px;color:#637169;line-height:1.7}.switch{display:flex;gap:8px;align-items:center}.switch input{width:auto}
@media(max-width:700px){.grid{grid-template-columns:1fr}.full{grid-column:auto}header h1{font-size:18px}}
</style>
</head>
<body>
<header><div class="row"><h1>MIG FARM — رفع منتجات Noon</h1><button id="logout">خروج</button></div></header>
<main>
<div class="topnote">املأ بيانات المنتج ثم راجعها واضغط «إرسال إلى نون». الصور هنا تُضاف كرابط HTTPS مباشر؛ ويمكنك لصق أكثر من رابط كل رابط في سطر.</div>
<div class="panel">
<form id="form">
<div class="grid">
<div><label>Partner SKU *</label><input name="partner_sku" required placeholder="MIG-SEED-001"></div>
<div><label>العلامة التجارية *</label><input name="brand" required placeholder="MIG FARM"></div>
<div><label>اسم المنتج بالعربي</label><input name="title_ar"></div>
<div><label>Product Title English</label><input name="title_en"></div>
<div class="full"><label>الوصف العربي</label><textarea name="description_ar"></textarea></div>
<div class="full"><label>English Description</label><textarea name="description_en"></textarea></div>
<div><label>كود تصنيف Noon *</label><input name="category" required placeholder="اكتب Category code"></div>
<div><label>السعر AED *</label><input name="price" type="number" step="0.01" min="0" required></div>
<div><label>MSRP <span class="hint">اختياري</span></label><input name="msrp" type="number" step="0.01" min="0"></div>
<div><label>المخزون *</label><input name="qty" type="number" min="0" step="1" required></div>
<div><label>Warehouse Code <span class="hint">اختياري إذا محدد في Vercel</span></label><input name="warehouse_code"></div>
<div class="full"><label>روابط الصور HTTPS <span class="hint">كل رابط في سطر</span></label><textarea name="images" placeholder="https://...jpg&#10;https://...jpg"></textarea></div>
<div class="full"><label>Attributes JSON <span class="hint">اختياري / متقدم</span></label><textarea name="attributes" placeholder='{"attribute_key":{"values":[...]}}'></textarea></div>
<div class="full switch"><input id="activate" name="activate" type="checkbox"><label for="activate" style="margin:0">نشر المنتج عندما يصبح مؤهلًا (Publish when eligible)</label></div>
<div class="full switch"><input id="confirm" type="checkbox" required><label for="confirm" style="margin:0">راجعت البيانات وأوافق على الإرسال إلى Noon</label></div>
</div>
<div class="actions">
<button class="btn primary" type="submit">إرسال المنتج إلى Noon</button>
<button class="btn secondary" type="button" id="cats">اختبار التصنيفات</button>
<button class="btn secondary" type="button" id="clear">مسح الحقول</button>
</div>
</form>
<div id="status" class="status"></div>
</div>
</main>
<script>
const form=document.getElementById('form'), statusEl=document.getElementById('status');
function show(data,ok=true){statusEl.style.display='block';statusEl.className='status '+(ok?'ok':'bad');statusEl.textContent=typeof data==='string'?data:JSON.stringify(data,null,2);}
async function call(payload){
 const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await r.json().catch(()=>({error:'invalid_response'}));
 if(!r.ok) throw Object.assign(new Error(data.error||'request_failed'),{data});
 return data;
}
form.addEventListener('submit',async(e)=>{
 e.preventDefault();
 if(!document.getElementById('confirm').checked) return;
 const fd=new FormData(form);
 let attributes={};
 const raw=String(fd.get('attributes')||'').trim();
 if(raw){try{attributes=JSON.parse(raw)}catch{return show('Attributes JSON غير صالح',false)}}
 const images=String(fd.get('images')||'').split(/\\n+/).map(x=>x.trim()).filter(Boolean);
 const payload={action:'create_and_publish',product:{
  partner_sku:String(fd.get('partner_sku')||'').trim(),
  brand:String(fd.get('brand')||'').trim(),
  category:String(fd.get('category')||'').trim(),
  title_ar:String(fd.get('title_ar')||'').trim(),
  title_en:String(fd.get('title_en')||'').trim(),
  description_ar:String(fd.get('description_ar')||'').trim(),
  description_en:String(fd.get('description_en')||'').trim(),
  images,attributes
 },country_code:'ae',price:Number(fd.get('price')),qty:Number(fd.get('qty')),activate:document.getElementById('activate').checked};
 const msrp=String(fd.get('msrp')||'').trim(), wh=String(fd.get('warehouse_code')||'').trim();
 if(msrp!=='')payload.msrp=Number(msrp); if(wh)payload.warehouse_code=wh;
 show('جاري الإرسال...',true);
 try{
   const data=await call(payload); show(data,true);
   const live=Boolean(data?.result?.summary?.live);
   alert(live?'تم التأكيد: المنتج Live على Noon':'تم الإرسال. المنتج غير مؤكد Live حتى الآن؛ راجع نتيجة QC الظاهرة.');
 }catch(err){show(err.data||err.message,false)}
});
document.getElementById('cats').onclick=async()=>{show('جاري الاختبار...',true);try{show(await call({action:'list_categories'}),true)}catch(e){show(e.data||e.message,false)}};
document.getElementById('clear').onclick=()=>{form.reset();statusEl.style.display='none'};
document.getElementById('logout').onclick=async()=>{await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ui_logout'})});location.reload();};
</script>
</body></html>`;
}

const CAPABILITIES = [
  "list_categories",
  "category_attributes",
  "upsert_product",
  "get_content",
  "set_price",
  "get_price",
  "set_stock",
  "create_and_publish",
];

export async function GET(request) {
  const url = new URL(request?.url || "https://local/api/noon-product");
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    String(request?.headers?.get?.("accept") || "").includes("application/json");

  if (!wantsJson) {
    return hasValidUiSession(request)
      ? htmlResponse(appPage())
      : htmlResponse(loginPage());
  }

  return Response.json(
    {
      ok: true,
      service: "MIG FARM Noon Product Manager",
      version: "1.1.0",
      authenticated_write_api: Boolean(getActionToken()),
      ui_session: hasValidUiSession(request),
      capabilities: CAPABILITIES,
      note:
        "POST requests require a valid UI session or Authorization: Bearer <NOON_ACTION_TOKEN>. A product is only reported live when noon GetContent returns OVERALL_STATUS_ACTIVE for all languages.",
      time: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function POST(request) {
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };

  try {
    if (!sameOrigin(request)) {
      throw new NoonApiError("cross_site_request_blocked", 403);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      throw new NoonApiError("invalid_json", 400);
    }

    const action = ensureString(body?.action, "action");

    if (action === "ui_login") {
      const session = createUiSession(String(body?.token || ""));
      if (!session) throw new NoonApiError("invalid_credentials", 401);
      return Response.json(
        { ok: true, authenticated: true },
        {
          status: 200,
          headers: {
            ...headers,
            "Set-Cookie": session.cookie,
          },
        },
      );
    }

    if (action === "ui_logout") {
      return Response.json(
        { ok: true, authenticated: false },
        {
          status: 200,
          headers: {
            ...headers,
            "Set-Cookie": `${UI_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
          },
        },
      );
    }

    requireAuthorized(request);

    const result = await dispatch(action, body);

    return Response.json(
      {
        ok: true,
        action,
        result,
        time: new Date().toISOString(),
      },
      { status: 200, headers },
    );
  } catch (error) {
    const status =
      error instanceof NoonApiError ? error.status : 500;

    console.error("Noon product manager error", {
      name: error?.name,
      message: error?.message,
      status,
    });

    return Response.json(
      {
        ok: false,
        error: String(error?.message || "unknown_error"),
        details:
          error instanceof NoonApiError ? error.details : undefined,
        time: new Date().toISOString(),
      },
      { status, headers },
    );
  }
}
