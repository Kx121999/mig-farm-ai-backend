import crypto from "crypto";
import { handleMcpGET, handleMcpPOST, handleMcpOPTIONS } from "../lib/noon-mcp.js";
import { handleOAuthGET, handleOAuthPOST } from "../lib/noon-oauth.js";

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
  const categoryCode = ensureString(
    body?.category_code || body?.category,
    "category_code",
  );
  return noonPost("/content/v1/categories/attributes/list", {
    category_code: categoryCode,
  });
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
.categoryBox{border:1px solid #d9e4da;background:#f8fbf8;border-radius:14px;padding:14px}.categoryRow{display:grid;grid-template-columns:1fr auto;gap:8px}.categoryRow .btn{white-space:nowrap}
#categorySelect{margin-top:9px;min-height:48px}.meta{margin-top:7px;color:#66766b;font-size:12px;line-height:1.6}
.attrPanel{border:1px solid #d9e4da;background:#fbfdfb;border-radius:14px;padding:14px}.attrTitle{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.pill{display:inline-block;background:#e8f3ea;color:#16532f;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700}
.attrGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.attrCard{border:1px solid #e2e9e3;border-radius:12px;padding:12px;background:#fff}.attrCard.required{border-color:#b9d9c0;background:#fcfffc}.attrCode{font-family:Consolas,monospace;font-size:12px;color:#4f6656;margin-bottom:8px;direction:ltr;text-align:left}.requiredMark{color:#b3261e;font-weight:900}.langLabel{font-size:12px;color:#66766b;margin:7px 0 4px}.attrHelp{font-size:11px;color:#7a887e;margin-top:6px;line-height:1.5}
details.advanced{border:1px dashed #ccd8ce;border-radius:12px;padding:10px 12px;background:#fafcfa}details.advanced summary{cursor:pointer;font-weight:700;color:#48604e}
.loader{display:none;margin-top:8px;color:#176237;font-weight:700}.emptyState{padding:18px;border:1px dashed #ccd8ce;border-radius:12px;color:#718078;text-align:center}
@media(max-width:700px){.grid,.attrGrid{grid-template-columns:1fr}.full{grid-column:auto}.categoryRow{grid-template-columns:1fr}header h1{font-size:18px}}
</style>
</head>
<body>
<header><div class="row"><h1>MIG FARM — رفع منتجات Noon</h1><button id="logout">خروج</button></div></header>
<main>
<div class="topnote">اختَر تصنيف Noon أولًا. النظام يجلب التصنيفات والحقول المطلوبة مباشرة من Noon ويحوّل الـ Attributes إلى خانات عادية بدل كتابة JSON يدويًا.</div>
<div class="panel">
<form id="form">
<div class="grid">
<div><label>Partner SKU *</label><input name="partner_sku" required placeholder="MIG-SEED-001"></div>
<div><label>العلامة التجارية *</label><input name="brand" required placeholder="اسم العلامة على العبوة"></div>
<div><label>اسم المنتج بالعربي</label><input name="title_ar"></div>
<div><label>Product Title English</label><input name="title_en"></div>
<div class="full"><label>الوصف العربي</label><textarea name="description_ar"></textarea></div>
<div class="full"><label>English Description</label><textarea name="description_en"></textarea></div>

<div class="full categoryBox">
<label>تصنيف Noon *</label>
<div class="categoryRow">
<input id="categorySearch" type="search" placeholder="ابحث مثل: seed أو garden أو plant">
<button class="btn secondary" type="button" id="refreshCats">تحديث التصنيفات</button>
</div>
<select id="categorySelect" name="category" required>
<option value="">جاري تحميل تصنيفات Noon...</option>
</select>
<div id="categoryMeta" class="meta"></div>
<div id="categoryLoader" class="loader">جاري الاتصال بـ Noon...</div>
</div>

<div class="full attrPanel">
<div class="attrTitle"><label style="margin:0">خصائص Noon المطلوبة للتصنيف</label><span id="attrCount" class="pill">اختر التصنيف</span></div>
<div id="dynamicAttrs" class="emptyState">بعد اختيار التصنيف ستظهر هنا الحقول الإجبارية والاختيارية تلقائيًا.</div>
</div>

<div><label>السعر AED *</label><input name="price" type="number" step="0.01" min="0" required></div>
<div><label>MSRP <span class="hint">اختياري</span></label><input name="msrp" type="number" step="0.01" min="0"></div>
<div><label>المخزون *</label><input name="qty" type="number" min="0" step="1" required></div>
<div><label>Warehouse Code <span class="hint">اختياري إذا محدد في Vercel</span></label><input name="warehouse_code"></div>
<div class="full"><label>روابط الصور HTTPS <span class="hint">كل رابط في سطر</span></label><textarea name="images" placeholder="https://...jpg&#10;https://...jpg"></textarea></div>

<div class="full">
<details class="advanced">
<summary>خيارات متقدمة — Attributes JSON إضافية</summary>
<div class="meta">اتركها فارغة في الاستخدام الطبيعي. تستخدم فقط لإضافة خاصية غير ظاهرة في الحقول التلقائية.</div>
<textarea name="attributes_extra" style="margin-top:8px" placeholder='{"attribute_key":{"values":[...]}}'></textarea>
</details>
</div>

<div class="full switch"><input id="activate" name="activate" type="checkbox"><label for="activate" style="margin:0">نشر المنتج عندما يصبح مؤهلًا (Publish when eligible)</label></div>
<div class="full switch"><input id="confirm" type="checkbox" required><label for="confirm" style="margin:0">راجعت البيانات وأوافق على الإرسال إلى Noon</label></div>
</div>
<div class="actions">
<button class="btn primary" type="submit">إرسال المنتج إلى Noon</button>
<button class="btn secondary" type="button" id="reloadAttrs">إعادة تحميل خصائص التصنيف</button>
<button class="btn secondary" type="button" id="clear">مسح الحقول</button>
</div>
</form>
<div id="status" class="status"></div>
</div>
</main>
<script>
const form=document.getElementById('form');
const statusEl=document.getElementById('status');
const categorySearch=document.getElementById('categorySearch');
const categorySelect=document.getElementById('categorySelect');
const categoryMeta=document.getElementById('categoryMeta');
const categoryLoader=document.getElementById('categoryLoader');
const dynamicAttrs=document.getElementById('dynamicAttrs');
const attrCount=document.getElementById('attrCount');
let categoriesCache=[];
let attributeDefs=[];

function show(data,ok=true){
 statusEl.style.display='block';
 statusEl.className='status '+(ok?'ok':'bad');
 statusEl.textContent=typeof data==='string'?data:JSON.stringify(data,null,2);
 statusEl.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function call(payload){
 const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await r.json().catch(()=>({error:'invalid_response'}));
 if(!r.ok) throw Object.assign(new Error(data.error||'request_failed'),{data});
 return data;
}
function esc(v){
 return String(v??'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
}
function categoryListFrom(data){
 const x=data&&data.result?data.result:data;
 if(Array.isArray(x)) return x;
 if(Array.isArray(x&&x.categories)) return x.categories;
 if(Array.isArray(x&&x.items)) return x.items.map(function(i){return typeof i==='string'?i:(i.category_code||i.code||i.name)}).filter(Boolean);
 return [];
}
function fillCategoryOptions(query){
 const q=String(query||'').trim().toLowerCase();
 const current=categorySelect.value;
 let list=categoriesCache.filter(function(x){return !q||String(x).toLowerCase().includes(q)});
 list=list.slice(0,500);
 categorySelect.innerHTML='<option value="">اختر تصنيف Noon...</option>'+list.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join('');
 if(current&&list.includes(current)) categorySelect.value=current;
 categoryMeta.textContent='إجمالي التصنيفات: '+categoriesCache.length+' — النتائج الظاهرة: '+list.length+(q?' — بحث: '+q:'');
}
async function loadCategories(){
 categoryLoader.style.display='block';
 categoryMeta.textContent='';
 try{
  const data=await call({action:'list_categories'});
  categoriesCache=categoryListFrom(data);
  fillCategoryOptions(categorySearch.value);
  if(!categoriesCache.length) show(data,false);
 }catch(e){
  categorySelect.innerHTML='<option value="">تعذر تحميل التصنيفات</option>';
  show(e.data||e.message,false);
 }finally{categoryLoader.style.display='none'}
}
function defLabel(a){
 return String(a.attribute_code||'attribute').replace(/_/g,' ');
}
function typeInput(a,id,required,placeholder){
 const t=String(a.attribute_type||'ATTRIBUTE_TYPE_TEXT');
 const req=required?' required':'';
 const min=a.number_min!=null?' min="'+esc(a.number_min)+'"':'';
 const max=a.number_max!=null?' max="'+esc(a.number_max)+'"':'';
 const minl=a.min_characters!=null?' minlength="'+esc(a.min_characters)+'"':'';
 const maxl=a.max_characters!=null?' maxlength="'+esc(a.max_characters)+'"':'';
 if(t==='ATTRIBUTE_TYPE_SELECT'&&Array.isArray(a.attribute_options)&&a.attribute_options.length){
  return '<select id="'+esc(id)+'" data-attr-input="1"'+req+'><option value="">اختر...</option>'+a.attribute_options.map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>'}).join('')+'</select>';
 }
 if(t==='ATTRIBUTE_TYPE_BOOL'){
  return '<select id="'+esc(id)+'" data-attr-input="1"'+req+'><option value="">اختر...</option><option value="true">نعم / true</option><option value="false">لا / false</option></select>';
 }
 if(t==='ATTRIBUTE_TYPE_NUMERIC'||t==='ATTRIBUTE_TYPE_METRIC'){
  return '<input id="'+esc(id)+'" data-attr-input="1" type="number" step="any"'+min+max+req+' placeholder="'+esc(placeholder||'أدخل قيمة')+'">';
 }
 if(t==='ATTRIBUTE_TYPE_DATETIME'){
  return '<input id="'+esc(id)+'" data-attr-input="1" type="datetime-local"'+req+'>';
 }
 if(a.is_multivalued||Number(a.max_characters||0)>140||t==='ATTRIBUTE_TYPE_JSONDICT'){
  return '<textarea id="'+esc(id)+'" data-attr-input="1"'+minl+maxl+req+' placeholder="'+esc(a.is_multivalued?'كل قيمة في سطر':placeholder||'أدخل القيمة')+'"></textarea>';
 }
 return '<input id="'+esc(id)+'" data-attr-input="1" type="text"'+minl+maxl+req+' placeholder="'+esc(placeholder||'أدخل القيمة')+'">';
}
function renderOneAttribute(a){
 const code=String(a.attribute_code||'');
 if(!code) return '';
 if(code==='product_title'||code==='long_description') return '';
 const mandatory=Boolean(a.is_mandatory);
 const mark=mandatory?'<span class="requiredMark"> *</span>':'';
 let fields='';
 if(a.is_localizable){
  fields+='<div class="langLabel">العربي</div>'+typeInput(a,'attr_'+code+'_ar',mandatory,'القيمة بالعربي');
  fields+='<div class="langLabel">English</div>'+typeInput(a,'attr_'+code+'_en',mandatory,'English value');
 }else{
  fields+=typeInput(a,'attr_'+code,mandatory,'القيمة');
 }
 if(String(a.attribute_type)==='ATTRIBUTE_TYPE_METRIC'&&Array.isArray(a.attribute_metric_units)&&a.attribute_metric_units.length){
  fields+='<div class="langLabel">الوحدة</div><select id="attr_'+esc(code)+'_unit" data-attr-unit="1"'+(mandatory?' required':'')+'><option value="">اختر الوحدة...</option>'+a.attribute_metric_units.map(function(u){return '<option value="'+esc(u)+'">'+esc(u)+'</option>'}).join('')+'</select>';
 }
 const rules=[];
 if(a.is_multivalued) rules.push('متعدد القيم');
 if(a.max_values!=null) rules.push('الحد الأقصى '+a.max_values+' قيم');
 if(a.min_characters!=null||a.max_characters!=null) rules.push('حروف '+(a.min_characters??0)+'–'+(a.max_characters??'∞'));
 if(a.number_min!=null||a.number_max!=null) rules.push('مدى '+(a.number_min??'−∞')+' إلى '+(a.number_max??'∞'));
 return '<div class="attrCard '+(mandatory?'required':'')+'"><label>'+esc(defLabel(a))+mark+'</label><div class="attrCode">'+esc(code)+'</div>'+fields+(rules.length?'<div class="attrHelp">'+esc(rules.join(' • '))+'</div>':'')+'</div>';
}
function renderAttributes(defs){
 attributeDefs=Array.isArray(defs)?defs:[];
 const visible=attributeDefs.filter(function(a){return a&&a.attribute_code!=='product_title'&&a.attribute_code!=='long_description'});
 const mandatory=visible.filter(function(a){return a.is_mandatory}).length;
 attrCount.textContent=visible.length+' خصائص — '+mandatory+' إجبارية';
 if(!visible.length){
  dynamicAttrs.className='emptyState';
  dynamicAttrs.textContent='لم يرجع Noon خصائص إضافية لهذا التصنيف، أو أن الاستجابة تحتاج مراجعة.';
  return;
 }
 dynamicAttrs.className='attrGrid';
 dynamicAttrs.innerHTML=visible.map(renderOneAttribute).join('');
}
function attrDefsFrom(data){
 const x=data&&data.result?data.result:data;
 if(Array.isArray(x&&x.attributes)) return x.attributes;
 if(Array.isArray(x)) return x;
 return [];
}
async function loadAttributes(category){
 const code=String(category||categorySelect.value||'').trim();
 if(!code) return;
 dynamicAttrs.className='emptyState';
 dynamicAttrs.textContent='جاري تحميل خصائص '+code+' من Noon...';
 attrCount.textContent='جاري التحميل...';
 try{
  const data=await call({action:'category_attributes',category_code:code});
  const defs=attrDefsFrom(data);
  renderAttributes(defs);
  if(!defs.length) show(data,false);
 }catch(e){
  attributeDefs=[];
  attrCount.textContent='تعذر التحميل';
  dynamicAttrs.className='emptyState';
  dynamicAttrs.textContent='تعذر تحميل خصائص التصنيف. راجع النتيجة أسفل الصفحة.';
  show(e.data||e.message,false);
 }
}
function valuesFromRaw(raw,multi,type){
 let arr=multi?String(raw||'').split(/\\n+|,/).map(function(x){return x.trim()}).filter(Boolean):[String(raw||'').trim()].filter(Boolean);
 return arr.map(function(v){
  if(type==='ATTRIBUTE_TYPE_BOOL') return v==='true';
  if(type==='ATTRIBUTE_TYPE_NUMERIC'||type==='ATTRIBUTE_TYPE_METRIC') return Number(v);
  if(type==='ATTRIBUTE_TYPE_JSONDICT'){try{return JSON.parse(v)}catch{return v}}
  return v;
 });
}
function collectAttributeValues(){
 const out={};
 const titleAr=String(form.elements.title_ar.value||'').trim();
 const titleEn=String(form.elements.title_en.value||'').trim();
 const descAr=String(form.elements.description_ar.value||'').trim();
 const descEn=String(form.elements.description_en.value||'').trim();
 const missing=[];
 attributeDefs.forEach(function(a){
  const code=String(a.attribute_code||'');
  if(!code) return;
  if(code==='product_title'){
   if(a.is_mandatory&&(!titleAr||!titleEn)) missing.push('اسم المنتج عربي + English');
   return;
  }
  if(code==='long_description'){
   if(a.is_mandatory&&(!descAr||!descEn)) missing.push('الوصف عربي + English');
   return;
  }
  const type=String(a.attribute_type||'ATTRIBUTE_TYPE_TEXT');
  const vals=[];
  if(a.is_localizable){
   [['ar','LANGUAGE_AR'],['en','LANGUAGE_EN']].forEach(function(pair){
    const el=document.getElementById('attr_'+code+'_'+pair[0]);
    const raw=el?el.value:'';
    const pieces=valuesFromRaw(raw,a.is_multivalued,type);
    pieces.forEach(function(v,i){vals.push({value:v,language:pair[1],sort:a.is_multivalued?i+1:undefined})});
    if(a.is_mandatory&&!pieces.length) missing.push(code+' '+pair[0].toUpperCase());
   });
  }else{
   const el=document.getElementById('attr_'+code);
   const pieces=valuesFromRaw(el?el.value:'',a.is_multivalued,type);
   pieces.forEach(function(v,i){vals.push({value:v,sort:a.is_multivalued?i+1:undefined})});
   if(a.is_mandatory&&!pieces.length) missing.push(code);
  }
  if(vals.length){
   vals.forEach(function(v){if(v.sort===undefined) delete v.sort});
   out[code]={values:vals};
  }
  if(type==='ATTRIBUTE_TYPE_METRIC'){
   const unitEl=document.getElementById('attr_'+code+'_unit');
   const unit=unitEl?String(unitEl.value||'').trim():'';
   if(a.is_mandatory&&!unit) missing.push(code+'_unit');
   if(unit){
    const unitVals=[];
    if(a.is_localizable){
     if(document.getElementById('attr_'+code+'_ar')&&document.getElementById('attr_'+code+'_ar').value) unitVals.push({value:unit,language:'LANGUAGE_AR'});
     if(document.getElementById('attr_'+code+'_en')&&document.getElementById('attr_'+code+'_en').value) unitVals.push({value:unit,language:'LANGUAGE_EN'});
    }else unitVals.push({value:unit});
    out[code+'_unit']={values:unitVals};
   }
  }
 });
 return {attributes:out,missing:Array.from(new Set(missing))};
}

categorySearch.addEventListener('input',function(){fillCategoryOptions(categorySearch.value)});
categorySelect.addEventListener('change',function(){if(categorySelect.value)loadAttributes(categorySelect.value)});
document.getElementById('refreshCats').onclick=loadCategories;
document.getElementById('reloadAttrs').onclick=function(){loadAttributes(categorySelect.value)};

form.addEventListener('submit',async function(e){
 e.preventDefault();
 if(!document.getElementById('confirm').checked) return;
 const fd=new FormData(form);
 if(!String(fd.get('category')||'').trim()) return show('اختر تصنيف Noon أولًا.',false);
 const collected=collectAttributeValues();
 if(collected.missing.length) return show('أكمل الحقول الإجبارية التالية:\\n- '+collected.missing.join('\\n- '),false);
 let attributes=collected.attributes;
 const rawExtra=String(fd.get('attributes_extra')||'').trim();
 if(rawExtra){
  try{attributes=Object.assign(attributes,JSON.parse(rawExtra))}
  catch{return show('Attributes JSON الإضافية غير صالحة',false)}
 }
 const images=String(fd.get('images')||'').split(/\\n+/).map(function(x){return x.trim()}).filter(Boolean);
 const payload={action:'create_and_publish',product:{
  partner_sku:String(fd.get('partner_sku')||'').trim(),
  brand:String(fd.get('brand')||'').trim(),
  category:String(fd.get('category')||'').trim(),
  title_ar:String(fd.get('title_ar')||'').trim(),
  title_en:String(fd.get('title_en')||'').trim(),
  description_ar:String(fd.get('description_ar')||'').trim(),
  description_en:String(fd.get('description_en')||'').trim(),
  images:images,attributes:attributes
 },country_code:'ae',price:Number(fd.get('price')),qty:Number(fd.get('qty')),activate:document.getElementById('activate').checked};
 const msrp=String(fd.get('msrp')||'').trim(), wh=String(fd.get('warehouse_code')||'').trim();
 if(msrp!=='')payload.msrp=Number(msrp);
 if(wh)payload.warehouse_code=wh;
 show('جاري الإرسال إلى Noon...',true);
 try{
  const data=await call(payload);
  show(data,true);
  const live=Boolean(data&&data.result&&data.result.summary&&data.result.summary.live);
  alert(live?'تم التأكيد: المنتج Live على Noon':'تم الإرسال. المنتج غير مؤكد Live حتى الآن؛ راجع نتيجة QC الظاهرة.');
 }catch(err){show(err.data||err.message,false)}
});
document.getElementById('clear').onclick=function(){
 form.reset();
 categorySearch.value='';
 fillCategoryOptions('');
 attributeDefs=[];
 attrCount.textContent='اختر التصنيف';
 dynamicAttrs.className='emptyState';
 dynamicAttrs.textContent='بعد اختيار التصنيف ستظهر هنا الحقول الإجبارية والاختيارية تلقائيًا.';
 statusEl.style.display='none';
};
document.getElementById('logout').onclick=async function(){
 await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ui_logout'})});
 location.reload();
};
loadCategories();
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
  const internalRoute = url.searchParams.get("route") || "";
  if (internalRoute === "mcp") return handleMcpGET(request);
  if (["protected", "metadata", "authorize"].includes(internalRoute)) {
    return handleOAuthGET(request, internalRoute);
  }

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
      version: "1.2.0",
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
  const url = new URL(request?.url || "https://local/api/noon-product");
  const internalRoute = url.searchParams.get("route") || "";
  if (internalRoute === "mcp") return handleMcpPOST(request, dispatch);
  if (["authorize", "token"].includes(internalRoute)) {
    return handleOAuthPOST(request, internalRoute);
  }

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

export async function OPTIONS(request) {
  const url = new URL(request?.url || "https://local/api/noon-product");
  if ((url.searchParams.get("route") || "") === "mcp") {
    return handleMcpOPTIONS();
  }
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
