const SITE_ORIGIN = (process.env.ODOO_SITE_URL || "https://edu-mig-for-agriculture.odoo.com").replace(/\/+$/, "");

const PRODUCT_CACHE_TTL = 10 * 60 * 1000;
const SEARCH_CACHE_TTL = 3 * 60 * 1000;

const productCache = globalThis.__migProductCache || new Map();
const searchCache = globalThis.__migSearchCache || new Map();
globalThis.__migProductCache = productCache;
globalThis.__migSearchCache = searchCache;

function decodeHtml(value = "") {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripHtml(value = "") {
  return decodeHtml(
    String(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function clean(value = "", max = 5000) {
  return stripHtml(value).slice(0, max);
}

function absoluteUrl(href = "") {
  try {
    return new URL(decodeHtml(href), SITE_ORIGIN).toString();
  } catch {
    return "";
  }
}

async function fetchText(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "MIG-FARM-AI-Catalog/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error(`Website fetch failed ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function metaContent(html, key, attribute = "property") {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+${attribute}=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${escaped}["'][^>]*>`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]).trim();
  }
  return "";
}

function findJsonLdProduct(html) {
  const scripts = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )];

  function findProduct(node) {
    if (!node) return null;

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findProduct(item);
        if (found) return found;
      }
      return null;
    }

    if (typeof node === "object") {
      const type = node["@type"];
      if (
        type === "Product" ||
        (Array.isArray(type) && type.includes("Product"))
      ) {
        return node;
      }

      if (node["@graph"]) {
        const found = findProduct(node["@graph"]);
        if (found) return found;
      }

      for (const value of Object.values(node)) {
        const found = findProduct(value);
        if (found) return found;
      }
    }

    return null;
  }

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(decodeHtml(script[1]).trim());
      const product = findProduct(parsed);
      if (product) return product;
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return null;
}

function firstOffer(offers) {
  if (!offers) return null;
  if (Array.isArray(offers)) return offers[0] || null;
  if (offers.offers && Array.isArray(offers.offers)) return offers.offers[0] || null;
  return offers;
}

function fallbackVisiblePrice(html) {
  const patterns = [
    /(?:AED|د\.?\s*إ\.?)\s*([0-9][0-9,.]*)/i,
    /([0-9][0-9,.]*)\s*(?:AED|د\.?\s*إ\.?)/i,
    /class=["'][^"']*(?:oe_price|product_price)[^"']*["'][^>]*>[\s\S]{0,250}?([0-9][0-9,.]*)/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return String(match[1] || "").replace(/,/g, "").trim();
    }
  }

  return "";
}

function h1Text(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? clean(match[1], 400) : "";
}

function descriptionFallback(html) {
  const itemProp = html.match(
    /<[^>]+itemprop=["']description["'][^>]*>([\s\S]*?)<\/[^>]+>/i
  );
  if (itemProp) return clean(itemProp[1], 2500);

  return (
    metaContent(html, "og:description") ||
    metaContent(html, "description", "name")
  ).slice(0, 2500);
}

function availabilityText(value = "") {
  const normalized = String(value).toLowerCase();

  if (normalized.includes("instock")) return "متوفر";
  if (normalized.includes("outofstock")) return "غير متوفر";
  if (normalized.includes("preorder")) return "طلب مسبق";

  return clean(value, 100);
}

export async function fetchProduct(url) {
  const cached = productCache.get(url);
  const now = Date.now();

  if (cached && now - cached.time < PRODUCT_CACHE_TTL) {
    return cached.value;
  }

  const html = await fetchText(url);
  const ld = findJsonLdProduct(html);
  const offer = firstOffer(ld?.offers);

  const name =
    clean(ld?.name, 500) ||
    metaContent(html, "og:title") ||
    h1Text(html) ||
    clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1], 500);

  const price =
    String(offer?.price ?? offer?.lowPrice ?? "").trim() ||
    metaContent(html, "product:price:amount") ||
    fallbackVisiblePrice(html);

  const currency =
    String(offer?.priceCurrency || "").trim() ||
    metaContent(html, "product:price:currency") ||
    (price ? "AED" : "");

  const product = {
    name,
    price,
    currency,
    sku: clean(ld?.sku || ld?.mpn || "", 200),
    availability: availabilityText(offer?.availability || ""),
    description: clean(ld?.description || descriptionFallback(html), 2500),
    brand: clean(
      typeof ld?.brand === "string" ? ld.brand : ld?.brand?.name || "",
      300
    ),
    url
  };

  productCache.set(url, { time: now, value: product });
  return product;
}

function extractProductLinks(html) {
  const urls = [];
  const seen = new Set();

  for (const match of html.matchAll(/href=["']([^"']*\/shop\/[^"'?#]+(?:\?[^"']*)?)["']/gi)) {
    const url = absoluteUrl(match[1]);
    if (!url) continue;

    const pathname = new URL(url).pathname;
    if (
      pathname === "/shop" ||
      pathname.startsWith("/shop/cart") ||
      pathname.startsWith("/shop/checkout") ||
      pathname.startsWith("/shop/payment") ||
      pathname.startsWith("/shop/confirmation") ||
      pathname.startsWith("/shop/category/")
    ) {
      continue;
    }

    const normalized = url.split("#")[0];
    if (!seen.has(normalized)) {
      seen.add(normalized);
      urls.push(normalized);
    }
  }

  return urls;
}

function normalizeSearch(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "فيه","في","عندكم","عندك","عايز","عاوز","عايزه","عاوزة","محتاج","محتاجه",
  "هل","موجود","موجوده","متوفر","متوفرة","طب","طيب","ايه","اي","إيه","ممكن",
  "قولي","قول","اديني","عايزين","بكام","كام","السعر","سعر","اسعار","الاسعار",
  "تفاصيل","تفاصيله","عن","من","لو","منتج","منتجات","عند","please","have","do",
  "you","price","prices","details","what","about","is","there","any","show","me"
]);

const GENERIC_FOLLOWUP = new Set([
  "الحار","حار","الحلو","حلو","السعر","اسعار","الاسعار","بكام","كام",
  "تفاصيل","تفاصيله","متوفر","موجود","النوع","الانواع"
]);

function usefulTerms(value = "") {
  return normalizeSearch(value)
    .split(/\s+/)
    .filter(Boolean)
    .filter(term => term.length > 1)
    .filter(term => !STOP_WORDS.has(term));
}

function historyUserMessages(history = []) {
  return history
    .filter(item => item && item.role === "user" && typeof item.content === "string")
    .map(item => item.content)
    .slice(-5);
}

export function buildCatalogQuery(message, history = []) {
  const currentTerms = usefulTerms(message);
  const onlyGeneric =
    currentTerms.length === 0 ||
    currentTerms.every(term => GENERIC_FOLLOWUP.has(term));

  if (!onlyGeneric) {
    return currentTerms.slice(0, 6).join(" ");
  }

  const prior = historyUserMessages(history).reverse();

  for (const previous of prior) {
    const terms = usefulTerms(previous).filter(term => !GENERIC_FOLLOWUP.has(term));
    if (terms.length) {
      return terms.slice(0, 6).join(" ");
    }
  }

  return currentTerms.join(" ") || normalizeSearch(message);
}

export async function searchProducts(query, limit = 8) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  const cacheKey = cleanQuery.toLowerCase();
  const cached = searchCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.time < SEARCH_CACHE_TTL) {
    return cached.value.slice(0, limit);
  }

  const searchUrl = `${SITE_ORIGIN}/shop?search=${encodeURIComponent(cleanQuery)}`;
  const html = await fetchText(searchUrl);
  const links = extractProductLinks(html).slice(0, Math.min(limit, 10));

  const products = (
    await Promise.all(
      links.map(async url => {
        try {
          return await fetchProduct(url);
        } catch {
          return null;
        }
      })
    )
  ).filter(product => product && product.name);

  searchCache.set(cacheKey, { time: now, value: products });
  return products.slice(0, limit);
}

const PAGE_RULES = [
  {
    keywords: ["تواصل","اتصال","واتساب","هاتف","ايميل","فرع","contact","phone","email","whatsapp"],
    path: "/contactus",
    title: "بيانات التواصل"
  },
  {
    keywords: ["خدمات","الخدمات","service","services"],
    path: "/services",
    title: "الخدمات"
  },
  {
    keywords: ["دليل","زراعة","الزراعة","planting","guide"],
    path: "/planting-guide",
    title: "دليل الزراعة"
  },
  {
    keywords: ["شروط","احكام","الأحكام","terms","condition"],
    path: "/terms",
    title: "الشروط والأحكام"
  },
  {
    keywords: ["خصوصية","الخصوصية","privacy"],
    path: "/privacy-policy",
    title: "سياسة الخصوصية"
  },
  {
    keywords: ["كوكيز","ملفات","ارتباط","cookie","cookies"],
    path: "/cookie-policy",
    title: "سياسة ملفات الارتباط"
  }
];

export async function relevantPageText(message) {
  const normalized = normalizeSearch(message);

  const match = PAGE_RULES.find(rule =>
    rule.keywords.some(keyword => normalized.includes(normalizeSearch(keyword)))
  );

  if (!match) return null;

  try {
    const html = await fetchText(`${SITE_ORIGIN}${match.path}`);
    const body = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    const text = clean(body ? body[1] : html, 7000);

    return {
      title: match.title,
      path: match.path,
      url: `${SITE_ORIGIN}${match.path}`,
      text
    };
  } catch {
    return null;
  }
}

export function siteOrigin() {
  return SITE_ORIGIN;
}
