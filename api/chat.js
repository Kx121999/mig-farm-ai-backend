import {
  searchProducts,
  searchSitePages,
  siteOrigin,
  fetchProduct,
  getSitemapUrls
} from "../lib/site.js";

import { formatProducts, extractPageAnswer } from "../lib/emirati.js";

import {
  BUSINESS,
  directKnowledgeReply,
  historyReply,
  isProductIntent,
  isProductFollowup,
  currentProductReply,
  productPostFilter,
  productClarificationReply
} from "../lib/knowledge.js";

import {
  sanitizeConversationState,
  mergeConversationState,
  contextualRewrite,
  ambiguityReply,
  isClearlyOffDomain,
  nextConversationState,
  quickRepliesFor
} from "../lib/conversation.js";

import {
  cleanText,
  normalizeAr,
  safeLocale,
  safePageUrl,
  jsonResponse
} from "../lib/utils.js";


const VERSION="5.0.0";
const MODE="free_contextual_rag_v5";

const DEFAULT_ORIGINS=[
  "https://www.migfarm.com",
  "https://migfarm.com",
  "https://edu-mig-for-agriculture.odoo.com"
];


/* =========================================================
   MIG FARM SEEDS ONLY ENGINE
   ========================================================= */

const MIG_FARM_SEED_GROUPS={

  tomato:[
    "الشمال",
    "فوكس",
    "الريم",
    "مهره",
    "shamal",
    "mahra"
  ],

  cucumber:[
    "jabaara",
    "جباره",
    "wafra",
    "وفره"
  ],

  eggplant:[
    "عتيق",
    "مياسه",
    "مزيونه",
    "ateeq",
    "mayasa",
    "mazouna"
  ],

  pepper:[
    "جمر",
    "شهاب",
    "شراره",
    "الكوس",
    "جميرا",
    "البرشا",
    "jamra",
    "shihab",
    "sharara",
    "kous",
    "jumeirah",
    "barsha"
  ],

  melon:[
    "حلوه العين",
    "سلطانه",
    "الرومانسيه",
    "المدار",
    "sultana",
    "almadar"
  ],

  zucchini:[
    "عجيبه",
    "ajiba"
  ],

  corn:[
    "معدي",
    "maadi"
  ],

  cabbage:[
    "وهاج",
    "wahaj"
  ]

};


/* =========================================================
   CROP DETECTION
   ========================================================= */

const SEED_CROP_TERMS={

  tomato:[
    "طماطم",
    "طماطه",
    "بندوره",
    "tomato"
  ],

  cucumber:[
    "خيار",
    "cucumber"
  ],

  eggplant:[
    "باذنجان",
    "eggplant"
  ],

  pepper:[
    "فلفل",
    "فليفله",
    "pepper"
  ],

  melon:[
    "شمام",
    "كنتالوب",
    "melon",
    "cantaloupe"
  ],

  zucchini:[
    "كوسه",
    "كوسا",
    "zucchini",
    "squash"
  ],

  corn:[
    "ذره",
    "ذرة",
    "corn",
    "maize"
  ],

  cabbage:[
    "ملفوف",
    "كرنب",
    "cabbage"
  ],

  watermelon:[
    "بطيخ",
    "watermelon"
  ],

  okra:[
    "باميه",
    "بامية",
    "okra"
  ],

  onion:[
    "بصل",
    "onion"
  ],

  radish:[
    "فجل",
    "radish"
  ],

  beet:[
    "شمندر",
    "بنجر",
    "beet",
    "beetroot"
  ],

  spinach:[
    "سبانخ",
    "spinach"
  ],

  molokhia:[
    "ملوخيه",
    "ملوخية",
    "molokhia"
  ],

  turnip:[
    "لفت",
    "turnip"
  ],

  chard:[
    "سلق",
    "chard"
  ],

  fennel:[
    "شومر",
    "شمر",
    "fennel"
  ]

};


const SEED_WORDS=[
  "بذور",
  "بذره",
  "بذرة",
  "تقاوي",
  "seed",
  "seeds"
];


const NON_SEED_CATEGORY_WORDS=[

  "سماد",
  "اسمده",
  "اسمدة",
  "تغذيه النبات",
  "تغذية النبات",
  "fertilizer",
  "fertiliser",

  "مبيد",
  "مبيدات",
  "pesticide",
  "insecticide",

  "ري",
  "تنقيط",
  "irrigation",
  "drip",

  "ادوات",
  "أدوات",
  "معدات",
  "tools",
  "equipment",

  "بيت محمي",
  "بيوت محميه",
  "بيوت محمية",
  "greenhouse",

  "زراعه مائيه",
  "زراعة مائية",
  "hydroponic",
  "hydroponics"

];


/* =========================================================
   RATE LIMIT
   ========================================================= */

const rateBuckets=
  globalThis.__migV5Rate || new Map();

globalThis.__migV5Rate=rateBuckets;


/* =========================================================
   TEXT HELPERS
   ========================================================= */

function n(value=""){
  return normalizeAr(
    String(value||"")
  );
}


function hasTerm(text,term){

  const t=n(text);
  const q=n(term);

  if(!t || !q){
    return false;
  }

  if(q.includes(" ")){
    return t.includes(q);
  }

  const tokens=
    t.split(/\s+/)
      .filter(Boolean);

  if(tokens.includes(q)){
    return true;
  }

  return (
    q.length>=4 &&
    t.includes(q)
  );
}


function includesAny(text,terms=[]){

  return terms.some(
    term=>hasTerm(text,term)
  );

}


/* =========================================================
   MIG FARM VARIETY MARKERS
   ========================================================= */

function configuredSeedMarkers(){

  const extra=
    String(
      process.env.MIG_SEED_MARKERS||""
    )
    .split(",")
    .map(x=>x.trim())
    .filter(Boolean);

  const base=
    Object.values(
      MIG_FARM_SEED_GROUPS
    ).flat();

  return [
    ...new Set(
      [
        ...base,
        ...extra
      ]
      .map(n)
      .filter(Boolean)
    )
  ];

}


/* =========================================================
   DETECT REQUESTED CROP
   ========================================================= */

function requestedSeedGroup(
  message=""
){

  const t=n(message);

  for(
    const [group,terms]
    of Object.entries(SEED_CROP_TERMS)
  ){

    if(
      terms.some(
        term=>
          t.includes(
            n(term)
          )
      )
    ){
      return group;
    }

  }

  return "";

}


/* =========================================================
   DETECT SEED INTENT
   ========================================================= */

function explicitSeedIntent(
  message=""
){

  const t=n(message);

  if(!t){
    return false;
  }


  // المستخدم بيقول غير البذور
  if(
    /(غير|بدون|ما عدا|بعيد عن).{0,24}(بذور|بذره|بذرة|seed)/
      .test(t)
  ){
    return false;
  }


  // لو طلب قسم تاني صراحة
  if(
    NON_SEED_CATEGORY_WORDS.some(
      term=>hasTerm(t,term)
    )
  ){
    return false;
  }


  if(
    SEED_WORDS.some(
      term=>hasTerm(t,term)
    )
  ){
    return true;
  }


  return Boolean(
    requestedSeedGroup(message)
  );

}


/* =========================================================
   KEEP SEED CONTEXT
   ========================================================= */

function seedContextActive(
  message,
  state={},
  history=[]
){

  if(
    explicitSeedIntent(message)
  ){
    return true;
  }


  if(
    state?.product_query &&
    explicitSeedIntent(
      state.product_query
    )
  ){
    return true;
  }


  for(
    let i=history.length-1;
    i>=0;
    i--
  ){

    const item=history[i];

    if(
      !item ||
      item.role!=="user"
    ){
      continue;
    }


    if(
      explicitSeedIntent(
        item.content
      )
    ){
      return true;
    }


    if(
      isProductIntent(
        item.content
      ) &&
      !isProductFollowup(
        item.content
      )
    ){
      break;
    }

  }


  return false;

}


/* =========================================================
   PRODUCT TEXT
   ========================================================= */

function seedProductHay(
  product={}
){

  return n([
    product.name||"",
    product.sku||"",
    product.description||"",
    product.url||""
  ].join(" "));

}


/* =========================================================
   MIG FARM BRAND CHECK
   ========================================================= */

function isExplicitlyMigFarmBranded(
  product={}
){

  const hay=
    seedProductHay(product);

  return (
    /(mig\s*farm|migfarm|ميج\s*فارم|ميغ\s*فارم)/
      .test(hay)
  );

}


/* =========================================================
   MIG FARM KNOWN VARIETY CHECK
   ========================================================= */

function matchesMigFarmSeedMarker(
  product={}
){

  const hay=
    seedProductHay(product);

  return configuredSeedMarkers()
    .some(
      marker=>
        hay.includes(marker)
    );

}


/* =========================================================
   STRICT MIG FARM SEED CHECK
   ========================================================= */

function isMigFarmSeedProduct(
  product={}
){

  if(
    !product ||
    !product.name
  ){
    return false;
  }


  return (
    isExplicitlyMigFarmBranded(
      product
    )
    ||
    matchesMigFarmSeedMarker(
      product
    )
  );

}


/* =========================================================
   CROP FILTER
   ========================================================= */

function matchesSeedGroup(
  product={},
  group=""
){

  if(!group){
    return true;
  }


  const markers=
    MIG_FARM_SEED_GROUPS[group];


  if(
    !Array.isArray(markers) ||
    !markers.length
  ){

    const hay=
      seedProductHay(product);

    const terms=
      SEED_CROP_TERMS[group]||[];


    return (
      isExplicitlyMigFarmBranded(
        product
      )
      &&
      terms.some(
        term=>
          hay.includes(
            n(term)
          )
      )
    );

  }


  const hay=
    seedProductHay(product);


  return markers.some(
    marker=>
      hay.includes(
        n(marker)
      )
  );

}


/* =========================================================
   REMOVE DUPLICATES
   ========================================================= */

function dedupeProducts(
  products=[]
){

  const seen=
    new Set();

  const out=[];


  for(
    const product
    of products
  ){

    if(
      !product?.name
    ){
      continue;
    }


    const key=
      n(product.url||"")
      ||
      `${n(product.name)}|${String(product.price||"")}`;


    if(
      seen.has(key)
    ){
      continue;
    }


    seen.add(key);

    out.push(product);

  }


  return out;

}


/* =========================================================
   FILTER MIG FARM SEEDS ONLY
   ========================================================= */

function filterMigFarmSeedProducts(
  products=[],
  message=""
){

  const group=
    requestedSeedGroup(
      message
    );


  return dedupeProducts(
    products
  )
  .filter(
    isMigFarmSeedProduct
  )
  .filter(
    product=>
      matchesSeedGroup(
        product,
        group
      )
  );

}


/* =========================================================
   PRODUCT URL VALIDATION
   ========================================================= */

function safeProductUrlCandidate(
  url=""
){

  try{

    const u=
      new URL(url);

    const p=
      u.pathname;


    if(
      !p.startsWith("/shop/")
    ){
      return false;
    }


    if(
      p.startsWith(
        "/shop/category/"
      )
    ){
      return false;
    }


    if(
      [
        "/shop/cart",
        "/shop/checkout",
        "/shop/payment",
        "/shop/confirmation",
        "/shop/wishlist",
        "/shop/compare"
      ]
      .some(
        x=>p.startsWith(x)
      )
    ){
      return false;
    }


    return true;

  }
  catch{

    return false;

  }

}


/* =========================================================
   SITEMAP MIG FARM SEED SCORE
   ========================================================= */

function urlSeedMarkerScore(
  url="",
  group=""
){

  let raw="";


  try{

    raw=
      n(
        decodeURIComponent(
          new URL(url)
            .pathname
        )
      );

  }
  catch{

    return 0;

  }


  const markers=
    (
      group &&
      MIG_FARM_SEED_GROUPS[group]?.length
    )
    ?
    MIG_FARM_SEED_GROUPS[group]
    :
    configuredSeedMarkers();


  let score=0;


  for(
    const marker
    of markers
  ){

    if(
      raw.includes(
        n(marker)
      )
    ){
      score+=20;
    }

  }


  return score;

}


/* =========================================================
   DISCOVER MIG FARM SEEDS VIA SITEMAP
   ========================================================= */

async function discoverMigFarmSeedsFromSitemap(
  message,
  limit=20
){

  const group=
    requestedSeedGroup(
      message
    );


  let urls=[];


  try{

    urls=
      await getSitemapUrls();

  }
  catch{

    return [];

  }


  const candidates=
    urls
    .filter(
      safeProductUrlCandidate
    )
    .map(
      url=>({
        url,
        score:
          urlSeedMarkerScore(
            url,
            group
          )
      })
    )
    .filter(
      x=>x.score>0
    )
    .sort(
      (a,b)=>
        b.score-a.score
    )
    .slice(
      0,
      Math.min(
        24,
        limit*2
      )
    );


  const products=
    (
      await Promise.all(

        candidates.map(
          async item=>{

            try{

              return await fetchProduct(
                item.url
              );

            }
            catch{

              return null;

            }

          }
        )

      )
    )
    .filter(Boolean);


  return filterMigFarmSeedProducts(
    products,
    message
  )
  .slice(
    0,
    limit
  );

}


/* =========================================================
   SEARCH MIG FARM SEEDS ONLY
   ========================================================= */

async function searchMigFarmSeeds(
  message,
  history=[],
  limit=12
){

  let searched=[];


  try{

    searched=
      await searchProducts(
        message,
        history,
        30
      );

  }
  catch{}


  let own=
    filterMigFarmSeedProducts(
      searched,
      message
    );


  if(
    own.length <
    Math.min(
      4,
      limit
    )
  ){

    const discovered=
      await discoverMigFarmSeedsFromSitemap(
        message,
        limit
      );


    own=
      dedupeProducts([
        ...own,
        ...discovered
      ]);

  }


  return own.slice(
    0,
    limit
  );

}


/* =========================================================
   FORMAT SEED RESPONSE
   ========================================================= */

function formatMigFarmSeedProducts(
  products=[],
  locale="ar"
){

  if(
    !products.length
  ){
    return "";
  }


  const en=
    locale==="en";


  const rows=
    products.map(
      product=>{

        const price=
          String(
            product.price??""
          )
          .trim();


        const currency=
          String(
            product.currency||"AED"
          )
          .trim()
          ||
          "AED";


        const availability=
          String(
            product.availability||""
          )
          .trim();


        const pricePart=
          price
          ?
          `${price} ${currency}`
          :
          (
            en
            ?
            "price not shown"
            :
            "السعر مب ظاهر"
          );


        return (
          `• ${product.name} — ${pricePart}`
          +
          (
            availability
            ?
            ` - ${availability}`
            :
            ""
          )
        );

      }
    );


  return en

    ?
    `I found these MIG FARM seed varieties:\n${rows.join("\n")}`

    :
    `أكيد 🌱 هذي بذور MIG FARM المطابقة لطلبك:\n${rows.join("\n")}`;

}


/* =========================================================
   SEED QUICK REPLIES
   ========================================================= */

function migSeedQuickReplies(
  locale="ar"
){

  return locale==="en"

    ?
    [
      "Cheapest?",
      "Available?",
      "Compare them",
      "Tomato seeds"
    ]

    :
    [
      "الأرخص فيهم؟",
      "المتوفر منهم؟",
      "قارن بينهم",
      "بذور طماطم"
    ];

}


/* =========================================================
   CORS
   ========================================================= */

function allowedOrigins(){

  const configured=
    String(
      process.env.ALLOWED_ORIGINS||""
    )
    .split(",")
    .map(
      x=>x.trim()
    )
    .filter(Boolean);


  return [
    ...new Set([
      ...DEFAULT_ORIGINS,
      ...configured
    ])
  ];

}


function corsHeaders(
  origin
){

  const approved=
    origin &&
    allowedOrigins()
      .includes(origin);


  return {

    ...(
      approved
      ?
      {
        "Access-Control-Allow-Origin":
          origin
      }
      :
      {}
    ),

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type",

    "Access-Control-Max-Age":
      "86400",

    "Vary":
      "Origin"

  };

}


function isAllowedOrigin(
  origin
){

  return (
    !origin ||
    allowedOrigins()
      .includes(origin)
  );

}


/* =========================================================
   RATE LIMIT
   ========================================================= */

function rateLimit(
  key
){

  const now=
    Date.now();

  const windowMs=
    60000;

  const max=
    50;

  const current=
    rateBuckets.get(key);


  if(
    rateBuckets.size>5000
  ){

    for(
      const [bucketKey,bucket]
      of rateBuckets
    ){

      if(
        now-bucket.startedAt >
        windowMs*5
      ){

        rateBuckets.delete(
          bucketKey
        );

      }

    }

  }


  if(
    !current ||
    now-current.startedAt >
    windowMs
  ){

    rateBuckets.set(
      key,
      {
        startedAt:now,
        count:1
      }
    );

    return true;

  }


  current.count+=1;

  rateBuckets.set(
    key,
    current
  );


  return (
    current.count<=max
  );

}


/* =========================================================
   HISTORY NORMALIZATION
   ========================================================= */

function normalizeHistory(
  value
){

  return Array.isArray(value)

    ?
    value
    .filter(
      x=>
        x &&
        [
          "user",
          "assistant"
        ]
        .includes(
          x.role
        )
        &&
        typeof x.content==="string"
    )
    .slice(-14)
    .map(
      x=>({
        role:x.role,
        content:
          cleanText(
            x.content,
            3000
          )
      })
    )

    :
    [];

}


/* =========================================================
   PRODUCT CONTEXT
   ========================================================= */

function normalizeProductContext(
  value
){

  if(
    !value ||
    typeof value!=="object" ||
    Array.isArray(value)
  ){

    return null;

  }


  return {

    name:
      cleanText(
        value.name||
        value.title||
        "",
        500
      ),

    price:
      cleanText(
        String(
          value.price??""
        ),
        100
      ),

    currency:
      cleanText(
        value.currency||
        "AED",
        20
      ),

    availability:
      cleanText(
        value.availability||
        value.stock||
        "",
        100
      ),

    description:
      cleanText(
        value.description||
        "",
        1800
      ),

    url:
      safePageUrl(
        value.url||
        ""
      )

  };

}


/* =========================================================
   ACTION URL FIX
   ========================================================= */

function absoluteActionUrls(
  actions=[]
){

  const origin=
    siteOrigin();


  return actions.map(
    a=>{

      if(
        a.type!=="page" ||
        !a.url
      ){

        return a;

      }


      try{

        return {
          ...a,
          url:
            new URL(
              a.url,
              origin
            )
            .toString()
        };

      }
      catch{

        return a;

      }

    }
  );

}


/* =========================================================
   TRUSTED PRODUCT PAGE
   ========================================================= */

function trustedPageUrl(
  pageUrl
){

  if(
    !pageUrl
  ){
    return false;
  }


  try{

    const u=
      new URL(pageUrl);


    return new Set([
      new URL(
        siteOrigin()
      ).origin,

      "https://www.migfarm.com",

      "https://migfarm.com"

    ])
    .has(
      u.origin
    );

  }
  catch{

    return false;

  }

}


/* =========================================================
   CURRENT PRODUCT PAGE
   ========================================================= */

async function resolveCurrentProduct(
  pageUrl,
  productContext
){

  if(
    !pageUrl ||
    !trustedPageUrl(pageUrl)
  ){

    return null;

  }


  try{

    const u=
      new URL(pageUrl);


    if(
      !u.pathname
        .startsWith(
          "/shop/"
        )
      ||
      u.pathname
        .startsWith(
          "/shop/category/"
        )
    ){

      return null;

    }


    try{

      const live=
        await fetchProduct(
          pageUrl
        );


      if(
        live?.name
      ){

        return live;

      }

    }
    catch{}


    return productContext?.name
      ?
      productContext
      :
      null;

  }
  catch{

    return null;

  }

}


/* =========================================================
   FALLBACK
   ========================================================= */

function defaultFallback(
  locale="ar"
){

  return locale==="en"

    ?
    "I couldn't confirm that confidently from MIG FARM's website. Give me one more detail, or I can connect you with the team."

    :
    "ما قدرت أتأكد من هالمعلومة بثقة من موقع MIG FARM. عطِني تفصيل زيادة بسيط عشان أفهمك صح، أو أوصلك بالفريق.";

}


function offDomain(
  locale="ar"
){

  return locale==="en"

    ?
    "I'm focused on MIG FARM, agriculture, products, delivery and website services. Ask me anything in that area and I'll help."

    :
    "أنا مخصص لـ MIG FARM والزراعة والمنتجات والشحن وخدمات الموقع. اسألني بأي شي بهالمجال وأنا أساعدك.";

}


/* =========================================================
   RESPONSE BUILDER
   ========================================================= */

function makeResponse({

  payload={},

  status=200,

  cors={},

  sessionId,

  state,

  source,

  message,

  results=[],

  currentProduct=null,

  locale="ar"

}){

  const next=
    nextConversationState({

      previous:state,

      source,

      message,

      results,

      currentProduct

    });


  const topic=
    next.topic||"";


  return jsonResponse({

    session_id:
      sessionId,

    version:
      VERSION,

    mode:
      MODE,

    suggested_actions:
      absoluteActionUrls(
        payload.suggested_actions||
        payload.actions||
        []
      ),

    escalation:
      Boolean(
        payload.escalation
      ),

    ...payload,

    suggested_actions:
      absoluteActionUrls(
        payload.suggested_actions||
        payload.actions||
        []
      ),

    conversation_state:
      next,

    quick_replies:
      payload.quick_replies
      ||
      quickRepliesFor(
        topic,
        locale,
        Array.isArray(results) &&
        results.length>0
      ),

    source:
      source||
      payload.source||
      ""

  },status,cors);

}


/* =========================================================
   OPTIONS
   ========================================================= */

export async function OPTIONS(
  request
){

  const origin=
    request.headers
      .get("origin")
    ||
    "";


  if(
    !isAllowedOrigin(
      origin
    )
  ){

    return new Response(
      null,
      {
        status:403
      }
    );

  }


  return new Response(
    null,
    {
      status:204,
      headers:
        corsHeaders(
          origin
        )
    }
  );

}


/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request
){

  const origin=
    request.headers
      .get("origin")
    ||
    "";


  const cors=
    corsHeaders(
      origin
    );


  if(
    !isAllowedOrigin(
      origin
    )
  ){

    return jsonResponse(
      {
        error:
          "origin_not_allowed"
      },
      403,
      cors
    );

  }


  let body;


  try{

    body=
      await request.json();

  }
  catch{

    return jsonResponse(
      {
        error:
          "invalid_json"
      },
      400,
      cors
    );

  }


  const message=
    cleanText(
      body?.message,
      2500
    );


  const sessionId=
    cleanText(
      body?.session_id,
      160
    )
    ||
    crypto.randomUUID();


  const locale=
    safeLocale(
      body?.locale
    );


  const pageUrl=
    safePageUrl(
      body?.page_url
    );


  const pageTitle=
    cleanText(
      body?.page_title,
      500
    );


  const history=
    normalizeHistory(
      body?.history
    );


  const productContext=
    normalizeProductContext(
      body?.product_context
    );


  const clientState=
    sanitizeConversationState(
      body?.conversation_state
    );


  const state=
    mergeConversationState(
      clientState,
      history
    );


  /* EMPTY MESSAGE */

  if(
    !message
  ){

    return makeResponse({

      payload:{
        reply:
          locale==="en"
          ?
          "Write a message first."
          :
          "اكتب سؤالك أول."
      },

      status:400,

      cors,

      sessionId,

      state,

      source:
        "empty",

      message,

      locale

    });

  }


  /* RATE LIMIT */

  const ip=
    (
      request.headers
        .get(
          "x-forwarded-for"
        )
      ||
      "unknown"
    )
    .split(",")[0]
    .trim();


  if(
    !rateLimit(
      `${ip}:${sessionId}`
    )
  ){

    return makeResponse({

      payload:{
        reply:
          locale==="en"
          ?
          "Too many messages. Try again in a minute."
          :
          "رسائل وايد بسرعة 😄 جرّب عقب دقيقة."
      },

      status:429,

      cors,

      sessionId,

      state,

      source:
        "rate_limit",

      message,

      locale

    });

  }


  /* ======================================================
     A — DIRECT KNOWLEDGE
     ====================================================== */

  const direct=
    directKnowledgeReply(
      message,
      locale
    );


  if(
    direct
  ){

    return makeResponse({

      payload:{

        reply:
          direct.reply,

        suggested_actions:
          direct.actions||[],

        escalation:
          Boolean(
            direct.escalation
          )

      },

      cors,

      sessionId,

      state,

      source:
        direct.source,

      message,

      locale

    });

  }


  /* ======================================================
     B — CONTEXT REWRITE
     ====================================================== */

  const rewrite=
    contextualRewrite(
      message,
      state,
      history
    );


  if(
    rewrite.used &&
    rewrite.query!==message
  ){

    const contextualDirect=
      directKnowledgeReply(
        rewrite.query,
        locale
      );


    if(
      contextualDirect
    ){

      return makeResponse({

        payload:{

          reply:
            contextualDirect.reply,

          suggested_actions:
            contextualDirect.actions||[],

          escalation:
            Boolean(
              contextualDirect.escalation
            )

        },

        cors,

        sessionId,

        state,

        source:
          `context_${contextualDirect.source}`,

        message,

        locale

      });

    }

  }


  /* ======================================================
     C — PRODUCT MEMORY
     ====================================================== */

  const memory=
    historyReply(
      message,
      history,
      locale
    );


  if(
    memory
  ){

    return makeResponse({

      payload:{

        reply:
          memory.reply,

        suggested_actions:
          memory.actions||[]

      },

      cors,

      sessionId,

      state,

      source:
        memory.source,

      message,

      locale

    });

  }


  /* ======================================================
     D — CURRENT PRODUCT PAGE
     ====================================================== */

  const currentProduct=
    await resolveCurrentProduct(
      pageUrl,
      productContext
    );


  const currentAnswer=
    currentProductReply(
      message,
      currentProduct,
      locale
    );


  if(
    currentAnswer
  ){

    return makeResponse({

      payload:{

        reply:
          currentAnswer.reply,

        suggested_actions:
          pageUrl
          ?
          [{
            type:"page",

            label:
              locale==="en"
              ?
              "Open product"
              :
              "افتح المنتج",

            url:
              pageUrl

          }]
          :
          []

      },

      cors,

      sessionId,

      state,

      source:
        currentAnswer.source,

      message,

      currentProduct,

      locale

    });

  }


  /* ======================================================
     E — AMBIGUITY
     ====================================================== */

  const ambiguous=
    ambiguityReply(
      message,
      state,
      history,
      locale
    );


  if(
    ambiguous
  ){

    return makeResponse({

      payload:{

        reply:
          ambiguous,

        quick_replies:
          locale==="en"
          ?
          [
            "Delivery",
            "Nearest branch",
            "Products"
          ]
          :
          [
            "أقصد الشحن",
            "أقصد أقرب فرع",
            "أقصد منتج"
          ]

      },

      cors,

      sessionId,

      state,

      source:
        "clarify_context",

      message,

      locale

    });

  }


  /* ======================================================
     F — OFF DOMAIN
     ====================================================== */

  if(
    isClearlyOffDomain(
      message
    )
  ){

    return makeResponse({

      payload:{
        reply:
          offDomain(
            locale
          )
      },

      cors,

      sessionId,

      state,

      source:
        "off_domain",

      message,

      locale

    });

  }


  /* ======================================================
     PRODUCT CLARIFICATION
     ====================================================== */

  const clarification=
    productClarificationReply(
      message,
      locale
    );


  if(
    clarification
  ){

    return makeResponse({

      payload:{
        reply:
          clarification.reply
      },

      cors,

      sessionId,

      state,

      source:
        clarification.source,

      message,

      locale

    });

  }


  /* ======================================================
     LIVE SEARCH
     ====================================================== */

  let products=[];

  let pages=[];


  const effectiveQuery=
    rewrite.used
    ?
    rewrite.query
    :
    message;


  const migSeedScope=
    seedContextActive(
      message,
      state,
      history
    );


  try{

    const recentProductContext=

      isProductFollowup(
        message
      )

      &&

      (
        state.topic==="product"

        ||

        history
        .slice(-5)
        .some(
          x=>
            x.role==="user"
            &&
            isProductIntent(
              x.content
            )
        )
      );


    /* ================================================
       STRICT MIG FARM SEEDS ONLY
       ================================================ */

    if(
      migSeedScope
    ){

      products=
        await searchMigFarmSeeds(
          effectiveQuery,
          history,
          12
        );


      products=
        productPostFilter(
          products,
          message
        )
        .slice(
          0,
          8
        );

    }


    /* ================================================
       NORMAL PRODUCT SEARCH
       ================================================ */

    else if(

      isProductIntent(
        message
      )

      ||

      rewrite.topic==="product"

      ||

      recentProductContext

    ){

      products=
        await searchProducts(
          effectiveQuery,
          history,
          12
        );


      products=
        productPostFilter(
          products,
          message
        )
        .slice(
          0,
          8
        );

    }


    /* ================================================
       WEBSITE PAGE SEARCH
       NEVER RUN IT FOR A SEED QUERY
       ================================================ */

    if(
      !products.length &&
      !migSeedScope
    ){

      pages=
        await searchSitePages(
          effectiveQuery,
          5
        );

    }

  }
  catch(error){

    console.error(

      "MIG assistant lookup failed",

      {

        name:
          error?.name,

        message:
          error?.message,

        pageUrl,

        pageTitle,

        effectiveQuery,

        migSeedScope

      }

    );

  }


  /* ======================================================
     PRODUCT RESULTS
     ====================================================== */

  if(
    products.length
  ){

    const actions=
      products[0]?.url
      ?
      [{
        type:"page",

        label:
          locale==="en"
          ?
          "Open first product"
          :
          "افتح أول منتج",

        url:
          products[0].url
      }]
      :
      [];


    const cleanResults=
      products.map(
        p=>({

          name:
            p.name,

          price:
            p.price,

          currency:
            p.currency,

          availability:
            p.availability,

          sku:
            p.sku,

          url:
            p.url

        })
      );


    /* MIG FARM SEED RESPONSE */

    if(
      migSeedScope
    ){

      return makeResponse({

        payload:{

          reply:
            formatMigFarmSeedProducts(
              products,
              locale
            ),

          suggested_actions:
            actions,

          results:
            cleanResults,

          quick_replies:
            migSeedQuickReplies(
              locale
            ),

          brand_scope:
            "mig_farm_seeds_only"

        },

        cors,

        sessionId,

        state,

        source:
          "live_products_migfarm_seeds",

        message,

        results:
          cleanResults,

        locale

      });

    }


    /* NORMAL PRODUCT RESPONSE */

    return makeResponse({

      payload:{

        reply:
          formatProducts(
            products,
            locale
          ),

        suggested_actions:
          actions,

        results:
          cleanResults

      },

      cors,

      sessionId,

      state,

      source:
        "live_products",

      message,

      results:
        cleanResults,

      locale

    });

  }


  /* ======================================================
     NO MIG FARM SEED MATCH
     ====================================================== */

  if(
    migSeedScope
  ){

    return makeResponse({

      payload:{

        reply:
          locale==="en"

          ?
          "I couldn't confirm a matching MIG FARM seed variety in the live store. Tell me the crop, such as tomato, cucumber, pepper or eggplant, and I'll search MIG FARM varieties only."

          :
          "ما حصلت صنف بذور MIG FARM مطابق بشكل مؤكد في المتجر الحي. اكتب لي المحصول مثل طماطم أو خيار أو فلفل أو باذنجان، وأنا أدور لك على أصناف MIG FARM فقط.",


        quick_replies:
          locale==="en"
          ?
          [
            "Tomato seeds",
            "Cucumber seeds",
            "Pepper seeds",
            "Eggplant seeds"
          ]
          :
          [
            "بذور طماطم",
            "بذور خيار",
            "بذور فلفل",
            "بذور باذنجان"
          ],


        brand_scope:
          "mig_farm_seeds_only"

      },

      cors,

      sessionId,

      state,

      source:
        "migfarm_seed_no_match",

      message,

      locale

    });

  }


  /* ======================================================
     PAGE ANSWER
     ====================================================== */

  const pageAnswer=
    extractPageAnswer(
      pages,
      effectiveQuery,
      locale
    );


  if(
    pageAnswer?.reply
  ){

    return makeResponse({

      payload:{

        reply:
          pageAnswer.reply,

        confidence:
          pageAnswer.confidence,

        suggested_actions:
          pageAnswer.page?.url
          ?
          [{
            type:"page",

            label:
              locale==="en"
              ?
              "Open page"
              :
              "افتح الصفحة",

            url:
              pageAnswer.page.url
          }]
          :
          []

      },

      cors,

      sessionId,

      state,

      source:
        "live_site_page",

      message,

      locale

    });

  }


  /* ======================================================
     FINAL SAFE FALLBACK
     ====================================================== */

  return makeResponse({

    payload:{

      reply:
        defaultFallback(
          locale
        ),

      suggested_actions:[
        {
          type:"whatsapp",

          label:
            locale==="en"
            ?
            "WhatsApp MIG FARM"
            :
            "كلمنا واتساب",

          url:
            BUSINESS.whatsapp
        }
      ],

      escalation:true,

      page_context:{

        page_title:
          pageTitle,

        page_url:
          pageUrl

      }

    },

    cors,

    sessionId,

    state,

    source:
      "safe_fallback",

    message,

    locale

  });

}
