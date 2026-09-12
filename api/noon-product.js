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

function requireAuthorized(request) {
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

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "MIG FARM Noon Product Manager",
      version: "1.0.0",
      authenticated_write_api: Boolean(getActionToken()),
      capabilities: CAPABILITIES,
      note:
        "POST requests require Authorization: Bearer <NOON_ACTION_TOKEN>. A product is only reported live when noon GetContent returns OVERALL_STATUS_ACTIVE for all languages.",
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
    requireAuthorized(request);

    let body;
    try {
      body = await request.json();
    } catch {
      throw new NoonApiError("invalid_json", 400);
    }

    const action = ensureString(body?.action, "action");
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
