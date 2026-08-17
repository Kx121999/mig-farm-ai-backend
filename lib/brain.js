export const BUSINESS = {
  brand: "MIG FARM",
  company: "MIG FOR AGRICULTURE",
  country: "United Arab Emirates",
  currency: "AED",
  website: process.env.MIG_WEBSITE || "https://www.migfarm.com",
  email: process.env.MIG_EMAIL || "sales@migfarm.com",
  whatsapp: process.env.MIG_WHATSAPP_URL || "https://wa.me/971581768215",
  delivery: {
    scope: "UAE",
    standardFee: Number(process.env.DELIVERY_FEE_AED || 13),
    exactTimeConfirmed: false,
    internationalConfirmed: false
  },
  branches: {
    alAin: { ar: "العين", en: "Al Ain", phone: process.env.MIG_ALAIN_PHONE || "+971 58 176 8215" },
    sharjah: { ar: "الشارقة", en: "Sharjah", phone: process.env.MIG_SHARJAH_PHONE || "+971 54 702 5904" }
  },
  policies: {
    terms: "/terms",
    privacy: "/privacy-policy",
    cookies: "/cookie-policy"
  },
  payment: {
    confirmedMethods: [],
    sourceOfTruth: "checkout"
  },
  vat: {
    inclusionConfirmed: false
  },
  workingHours: {
    confirmed: false
  }
};

export const UAE_EMIRATES = [
  { key: "abu_dhabi", labelAr: "أبوظبي", aliases: ["ابوظبي","أبوظبي","abu dhabi"] },
  { key: "dubai", labelAr: "دبي", aliases: ["دبي","dubai"] },
  { key: "sharjah", labelAr: "الشارقة", aliases: ["الشارقه","الشارقة","sharjah"] },
  { key: "ajman", labelAr: "عجمان", aliases: ["عجمان","ajman"] },
  { key: "umm_al_quwain", labelAr: "أم القيوين", aliases: ["ام القيوين","أم القيوين","umm al quwain","uaq"] },
  { key: "ras_al_khaimah", labelAr: "رأس الخيمة", aliases: ["راس الخيمه","رأس الخيمة","ras al khaimah","rak"] },
  { key: "fujairah", labelAr: "الفجيرة", aliases: ["الفجيره","الفجيرة","fujairah"] },
  { key: "al_ain", labelAr: "العين", aliases: ["العين","al ain"] }
];

export const CATEGORIES = {
  seeds: {
    key: "seeds",
    labelAr: "البذور",
    labelEn: "Seeds",
    aliases: ["بذور","بذره","بذرة","تقاوي","seed","seeds"],
    queryHints: ["seeds","F1"],
    positive: ["seed","seeds","بذور","packet","mini packet","f1"],
    negative: ["fertilizer","سماد","pesticide","مبيد","irrigation","ري","tool","equipment","معده","معدات"],
    defaultQuickAr: ["بذور طماطم","بذور خيار","بذور فلفل","بذور باذنجان"]
  },
  fertilizer: {
    key: "fertilizer",
    labelAr: "الأسمدة وتغذية النبات",
    labelEn: "Fertilizers & Plant Nutrition",
    aliases: ["سماد","اسمده","أسمدة","اسمدة","تسميد","تغذيه النبات","تغذية النبات","fertilizer","fertilisers","fertilizers","plant nutrition","npk"],
    queryHints: ["fertilizer","plant nutrition","NPK"],
    positive: ["fertilizer","npk","microplus","katabloom","mapco","super phosphate","سماد","تسميد","زنك","حديد","boric"],
    negative: ["seed","seeds","بذور","cucumber","tomato","pepper","drill","saw","irrigation timer"]
  },
  pesticide: {
    key: "pesticide",
    labelAr: "المبيدات",
    labelEn: "Pesticides",
    aliases: ["مبيد","مبيدات","حشره","حشرة","حشرات","افات","آفات","pesticide","pesticides","insecticide","public health"],
    queryHints: ["pesticide","insecticide"],
    positive: ["pesticide","insecticide","zig zag","tickless","pilarclotrin","edomec","galloper","مبيد","قراد","عث","حشرات"],
    negative: ["seed","seeds","fertilizer","drill","timer","irrigation"]
  },
  irrigation: {
    key: "irrigation",
    labelAr: "الري",
    labelEn: "Irrigation",
    aliases: ["ري","تنقيط","شبكه ري","شبكة ري","تايمر ري","مؤقت ري","irrigation","drip","drip irrigation","timer"],
    queryHints: ["irrigation","drip","timer"],
    positive: ["irrigation","drip","timer","controller","ري","تنقيط","تايمر","مؤقت","كنترول"],
    negative: ["seed","fertilizer","pesticide","drill","saw"]
  },
  hydroponics: {
    key: "hydroponics",
    labelAr: "الزراعة المائية",
    labelEn: "Hydroponics",
    aliases: ["زراعه مائيه","زراعة مائية","هيدروبونيك","hydroponic","hydroponics"],
    queryHints: ["hydroponics"],
    positive: ["hydroponic","hydroponics","زراعة مائية","هيدروبونيك","nutrient","controller"],
    negative: ["seed","drill","saw"]
  },
  tools: {
    key: "tools",
    labelAr: "الأدوات والمعدات",
    labelEn: "Tools & Equipment",
    aliases: ["ادوات","أدوات","معدات","دريل","مقص","منشار","شريط قياس","متر قياس","rokfort","tools","equipment","drill","saw","pruning"],
    queryHints: ["tools","equipment","ROKFORT"],
    positive: ["rokfort","drill","saw","pruning","meter","دريل","مقص","منشار","متر","tool","equipment"],
    negative: ["seed","fertilizer","pesticide","irrigation"]
  },
  greenhouse: {
    key: "greenhouse",
    labelAr: "البيوت المحمية",
    labelEn: "Greenhouses",
    aliases: ["بيت محمي","بيوت محميه","بيوت محمية","جرين هاوس","دفيئه","دفيئة","greenhouse","greenhouses"],
    queryHints: ["greenhouse"],
    positive: ["greenhouse","بيت محمي","structure","cooling","ventilation"],
    negative: []
  },
  services: {
    key: "services",
    labelAr: "الخدمات والاستشارات الزراعية",
    labelEn: "Agricultural Services",
    aliases: ["خدمات","استشاره","استشارة","استشارات","مهندس","مهندسين","service","services","consult","consultation"],
    queryHints: ["services"],
    positive: [],
    negative: []
  }
};

export const CROPS = {
  tomato: { labelAr: "طماطم", aliases: ["طماطم","طماطه","بندوره","tomato"] },
  cucumber: { labelAr: "خيار", aliases: ["خيار","cucumber"] },
  eggplant: { labelAr: "باذنجان", aliases: ["باذنجان","eggplant"] },
  pepper: { labelAr: "فلفل", aliases: ["فلفل","فليفله","pepper","capsicum"] },
  watermelon: { labelAr: "بطيخ", aliases: ["بطيخ","رقي","watermelon"] },
  melon: { labelAr: "شمام", aliases: ["شمام","كنتالوب","melon","cantaloupe"] },
  zucchini: { labelAr: "كوسة", aliases: ["كوسه","كوسة","كوسا","zucchini","squash"] },
  okra: { labelAr: "بامية", aliases: ["باميه","بامية","okra"] },
  onion: { labelAr: "بصل", aliases: ["بصل","onion"] },
  corn: { labelAr: "ذرة", aliases: ["ذره","ذرة","corn","maize"] },
  cabbage: { labelAr: "ملفوف", aliases: ["ملفوف","كرنب","cabbage"] },
  beetroot: { labelAr: "شمندر", aliases: ["شمندر","بنجر","beetroot","beet"] },
  radish: { labelAr: "فجل", aliases: ["فجل","radish"] },
  turnip: { labelAr: "لفت", aliases: ["لفت","turnip"] },
  chard: { labelAr: "سلق", aliases: ["سلق","chard"] },
  spinach: { labelAr: "سبانخ", aliases: ["سبانخ","spinach"] },
  molokhia: { labelAr: "ملوخية", aliases: ["ملوخيه","ملوخية","molokhia"] },
  fennel: { labelAr: "شومر", aliases: ["شومر","شمر","fennel"] }
};

// Confirmed MIG FARM seed names and details supplied for the project.
// Live price/stock must always come from the store, not this table.
export const MIG_SEED_CATALOG = [
  { crop: "tomato", nameAr: "طماطم الشمال F1", aliases: ["الشمال","shamal"], facts: [] },
  { crop: "tomato", nameAr: "طماطم فوكس F1", aliases: ["فوكس","fox"], facts: [] },
  { crop: "tomato", nameAr: "طماطم الريم F1", aliases: ["الريم","reem"], facts: [] },
  { crop: "tomato", nameAr: "طماطم مهرة F1", aliases: ["مهره","مهرة","mahra"], facts: [] },

  { crop: "cucumber", nameAr: "خيار JABAARA F1", aliases: ["jabaara","jabaaara","جباره","جبارة"], facts: [] },
  { crop: "cucumber", nameAr: "خيار WAFRA F1", aliases: ["wafra","وفره","وفرة"], facts: [] },

  { crop: "eggplant", nameAr: "باذنجان عتيق F1", aliases: ["عتيق","ateeq"], facts: ["ثمار بنفسجية عريضة","العبوة المعروفة ضمن الكتالوج 500 بذرة"] },
  { crop: "eggplant", nameAr: "باذنجان مياسة F1", aliases: ["مياسه","مياسة","mayasa"], facts: ["ثمار بنفسجية طويلة","العبوة المعروفة ضمن الكتالوج 500 بذرة"] },
  { crop: "eggplant", nameAr: "باذنجان مزيونة الأبيض F1", aliases: ["مزيونه","مزيونة","mazouna"], facts: ["ثمار بيضاء","العبوة المعروفة ضمن الكتالوج 500 بذرة"] },

  { crop: "melon", nameAr: "شمام حلوة العين F1", aliases: ["حلوه العين","حلوة العين"], facts: [] },
  { crop: "melon", nameAr: "شمام سلطانة F1", aliases: ["سلطانه","سلطانة","sultana"], facts: [] },
  { crop: "melon", nameAr: "شمام الرومانسية F1", aliases: ["الرومانسيه","الرومانسية","romance"], facts: [] },
  { crop: "melon", nameAr: "شمام المدار F1", aliases: ["المدار","almadar"], facts: ["عبوة معروفة ضمن الكتالوج بـ500 بذرة"] },

  { crop: "pepper", nameAr: "فلفل جمر", aliases: ["جمر","jamra"], tags: ["hot"], facts: ["فلفل حار","العبوة المعروفة ضمن الكتالوج 500 بذرة"] },
  { crop: "pepper", nameAr: "فلفل شهاب", aliases: ["شهاب","shihab"], tags: ["hot"], facts: ["فلفل حار","العبوة المعروفة ضمن الكتالوج 500 بذرة"] },
  { crop: "pepper", nameAr: "فلفل شرارة", aliases: ["شراره","شرارة","sharara"], tags: ["hot"], facts: ["فلفل حار","العبوة المعروفة ضمن الكتالوج 500 بذرة"] },
  { crop: "pepper", nameAr: "فلفل الكوس", aliases: ["الكوس","kous"], tags: ["hot"], facts: ["فلفل حار","العبوة المعروفة ضمن الكتالوج 500 بذرة"] },
  { crop: "pepper", nameAr: "فلفل جميرا الأصفر", aliases: ["جميرا","jumeirah"], tags: ["sweet","yellow"], facts: ["فلفل حلو أصفر","العبوة المعروفة ضمن الكتالوج 500 بذرة"] },
  { crop: "pepper", nameAr: "فلفل البرشا الأخضر", aliases: ["البرشا","barsha"], tags: ["sweet","green"], facts: ["فلفل حلو أخضر","العبوة المعروفة ضمن الكتالوج 500 بذرة"] },

  { crop: "cabbage", nameAr: "ملفوف أحمر وهاج", aliases: ["وهاج","wahaj"], facts: ["ملفوف أحمر"] },
  { crop: "corn", nameAr: "ذرة سكرية معدي", aliases: ["معدي","maadi"], facts: ["ذرة سكرية"] },
  { crop: "zucchini", nameAr: "كوسة عجيبة F1", aliases: ["عجيبه","عجيبة","ajiba"], facts: ["طول الثمرة المذكور 10–12 سم","مذكور لها مقاومة ZYMV وWMV وPM","إنتاجية عالية"] },

  { crop: "watermelon", nameAr: "بذور بطيخ", aliases: ["بطيخ","watermelon"], facts: [] },
  { crop: "okra", nameAr: "بذور بامية", aliases: ["باميه","بامية","okra"], facts: [] },
  { crop: "onion", nameAr: "بذور بصل", aliases: ["بصل","onion"], facts: [] },
  { crop: "beetroot", nameAr: "بذور شمندر", aliases: ["شمندر","بنجر","beetroot"], facts: [] },
  { crop: "radish", nameAr: "بذور فجل أحمر", aliases: ["فجل","فجل احمر","فجل أحمر","radish"], facts: [] },
  { crop: "turnip", nameAr: "بذور لفت", aliases: ["لفت","turnip"], facts: [] },
  { crop: "chard", nameAr: "بذور سلق", aliases: ["سلق","chard"], facts: [] },
  { crop: "spinach", nameAr: "بذور سبانخ", aliases: ["سبانخ","spinach"], facts: [] },
  { crop: "molokhia", nameAr: "بذور ملوخية", aliases: ["ملوخيه","ملوخية","molokhia"], facts: [] },
  { crop: "fennel", nameAr: "بذور شومر", aliases: ["شومر","شمر","fennel"], facts: [] }
];

export const KNOWN_PRODUCT_KNOWLEDGE = [
  {
    key: "microplus",
    category: "fertilizer",
    names: ["microplus","micro plus","مايكرو بلس","ميكرو بلس"],
    titleAr: "MICROPLUS",
    facts: ["يحتوي على Zinc EDTA 15%","يتضمن Boric Acid","يتضمن Iron EDDHA 6%"],
    safety: "جرعة الاستخدام لازم تتأكد من ملصق المنتج أو من الفريق حسب المحصول وطريقة الاستخدام."
  },
  {
    key: "film",
    category: "fertilizer",
    names: ["film","فيلم","egyptchem","ايجيبت كيم"],
    titleAr: "Film - EgyptChem",
    facts: ["مادة ناشرة لمحلول الرش","تساعد على خفض pH محلول الرش","تفيد عندما تتكور القطرات أو لا يثبت محلول الرش بشكل جيد"],
    safety: "نسبة الإضافة تعتمد على تعليمات الملصق؛ ما نعطي جرعة تخمينية."
  },
  {
    key: "mapco_18_18_5",
    category: "fertilizer",
    names: ["mapco","18-18-5","18 18 5"],
    titleAr: "MAPCO 18-18-5",
    facts: ["تركيبة NPK مذكورة 18-18-5"],
    safety: "البرنامج والجرعة يتغيران حسب المحصول والمرحلة وطريقة الري."
  },
  {
    key: "super_phosphate",
    category: "fertilizer",
    names: ["super phosphate","سوبر فوسفات","0-20-0","0 20 0"],
    titleAr: "Super Phosphate 0-20-0",
    facts: ["التركيبة المذكورة 0-20-0"],
    safety: "الاستخدام يعتمد على تحليل التربة والمحصول والبرنامج الزراعي."
  },
  {
    key: "katabloom",
    category: "fertilizer",
    names: ["katabloom","كاتابلوم","12-12-17","12 12 17"],
    titleAr: "KATABLOOM 12-12-17",
    facts: ["التركيبة المذكورة 12-12-17"],
    safety: "تأكد من الملصق والبرنامج المناسب قبل تحديد الجرعة."
  },
  {
    key: "complex_extra",
    category: "fertilizer",
    names: ["complex extra","كومبلكس اكسترا","كومبلكس إكسترا"],
    titleAr: "Complex Extra",
    facts: [],
    safety: "لو تبا تركيبته أو جرعته بالضبط، أرسل اسم العبوة/الملصق عشان ما نخمن."
  },
  {
    key: "zig_zag",
    category: "pesticide",
    names: ["zig zag","زيج زاج","زيجزاج"],
    titleAr: "Zig Zag",
    facts: ["مبيد صحة عامة للحشرات الطائرة والزاحفة","مذكور ضمن المنتجات العضوية في مواد MIG FARM"],
    safety: "استخدمه حسب الملصق المسجل، مع معدات الوقاية المناسبة وبعيدًا عن الأطفال."
  },
  {
    key: "tickless",
    category: "pesticide",
    names: ["tickless","تيك ليس","تكلس"],
    titleAr: "Tickless",
    facts: ["مخصص ضمن مواد الصحة العامة للقراد والعث","مذكور أنه يحتوي على زيت الأرز 60%"],
    safety: "اتبع الملصق المسجل ولا تستخدم جرعة من مصدر غير موثوق."
  },
  {
    key: "pilarclotrin",
    category: "pesticide",
    names: ["pilarclotrin","بيلاركلوترين","500ml","500 ml"],
    titleAr: "Pilarclotrin 500ml",
    facts: ["الصيغة المذكورة ZC","حجم العبوة المذكور 500ml"],
    safety: "المحصول والآفة والجرعة لازم تتأكد من الملصق المسجل."
  },
  {
    key: "edomec",
    category: "pesticide",
    names: ["edomec","ايدومك","إيدومك","220 sc"],
    titleAr: "Edomec 220 SC",
    facts: ["التركيز/الصيغة المذكورة 220 SC","حجم العبوة المذكور 500ml"],
    safety: "لا نحدد استخدام أو جرعة بدون الملصق والمحصول والآفة."
  },
  {
    key: "galloper",
    category: "pesticide",
    names: ["galloper","جالوبر","3 sc"],
    titleAr: "Galloper 3 SC",
    facts: ["الصيغة المذكورة 3 SC","حجم العبوة المذكور 250ml"],
    safety: "لا نحدد جرعة من الذاكرة؛ المرجع هو الملصق المسجل."
  },
  {
    key: "rokfort_drill_850",
    category: "tools",
    names: ["rokfort","دريل 850","850w","850 w"],
    titleAr: "ROKFORT Drill 850W",
    facts: ["قدرة مذكورة 850W"],
    safety: "استخدم معدات الحماية واتبع تعليمات الجهاز."
  },
  {
    key: "rokfort_battery_drill",
    category: "tools",
    names: ["دريل بطاريه","دريل بطارية","21v drill","battery drill"],
    titleAr: "ROKFORT Battery Drill 21V",
    facts: ["بطارية مذكورة 21V"],
    safety: "تأكد من ملحقات الجهاز وتعليمات الشحن والاستخدام."
  },
  {
    key: "rokfort_pruner",
    category: "tools",
    names: ["مقص تقليم","pruning shear","brushless","28mm","28 mm"],
    titleAr: "ROKFORT Brushless Pruning Shear 21V",
    facts: ["بطارية مذكورة 21V","سعة قص مذكورة حتى 28mm","Brushless"],
    safety: "أداة قطع؛ استخدمها حسب تعليمات السلامة وابعد اليدين عن منطقة القص."
  },
  {
    key: "mini_chainsaw",
    category: "tools",
    names: ["منشار جنزيري صغير","mini chainsaw","chainsaw"],
    titleAr: "Mini Chainsaw",
    facts: ["منشار جنزيري صغير ضمن أدوات ROKFORT المعروضة"],
    safety: "استخدم واقي العين واليد واتبع تعليمات السلامة."
  },
  {
    key: "reciprocating_saw",
    category: "tools",
    names: ["منشار ترددي","reciprocating saw"],
    titleAr: "Reciprocating Saw",
    facts: ["منشار ترددي ضمن الأدوات المعروضة"],
    safety: "اختيار الشفرة وطريقة الاستخدام حسب المادة وتعليمات الجهاز."
  },
  {
    key: "tap_timer",
    category: "irrigation",
    names: ["tap timer","تايمر ري","مؤقت ري","حنفيه تايمر","حنفية تايمر"],
    titleAr: "Tap Timer",
    facts: ["يساعد على جدولة الري","يساعد على توفير الوقت وتقليل الري اليدوي","يمكن برمجته حسب احتياج النظام والموديل"],
    safety: "الضغط والتوصيلات والبرنامج تعتمد على موديل الجهاز ونظام الري."
  },
  {
    key: "irrigation_controller",
    category: "irrigation",
    names: ["irrigation controller","كنترول ري","وحده تحكم","وحدة تحكم","multi zone"],
    titleAr: "Electronic Irrigation Controller",
    facts: ["توجد وحدات تحكم إلكترونية متعددة المناطق ضمن فئة الري","تفيد في تنظيم مواعيد الري ومناطق التشغيل","يمكن استخدام البرمجة لتنظيم الري في أوقات مختلفة حسب الموديل"],
    safety: "عدد المناطق والمواصفات لازم تتأكد من الموديل المعروض."
  },
  {
    key: "zucchini_open_field_usa",
    category: "seeds",
    names: ["كوسه امريكي","كوسة أمريكي","open field zucchini usa","usa zucchini"],
    titleAr: "كوسة Open Field - USA",
    facts: ["العبوة المذكورة 500 بذرة","النقاوة المذكورة 99.9%","الإنبات المذكور 96%","معاملة Fludioxonil مذكورة","شرط التخزين المذكور أقل من 10°C","طول الثمار المذكور 9–11 سم","مذكور لها مقاومة ZYMV وPM"],
    safety: "اعتمد العبوة الحالية للتأكد من الدفعة وشروط التخزين والمعاملة قبل الاستخدام."
  },
  {
    key: "agricultural_cover_white",
    category: "tools",
    names: ["غطاء زراعي","الغطاء الزراعي","agricultural cover","white crop cover","3m 400m"],
    titleAr: "الغطاء الزراعي الأبيض",
    facts: ["المقاس المذكور في مواد MIG FARM عرض 3 متر وطول 400 متر","يُستخدم ضمن حلول تغطية المحصول والتبكير حسب التطبيق"],
    safety: "احسب الاحتياج حسب المساحة وطريقة التركيب قبل طلب الكمية."
  }
];

export const GREENHOUSE_KNOWLEDGE = {
  titleAr: "حلول البيوت المحمية",
  components: ["هيكل مجلفن","عزل مناسب للمشروع","تهوية","مراوح","تبريد","شبكة ري","لوحة تحكم"],
  note: "المواصفات النهائية تختلف حسب المساحة والمحصول والموقع والميزانية؛ القائمة توضح عناصر يمكن أن تدخل في التجهيز وليست وعدًا بأن كل مشروع يشملها كلها."
};

export const SERVICES = [
  "البذور",
  "الأسمدة والمبيدات والمغذيات",
  "المعدات والأدوات الزراعية",
  "البيوت المحمية",
  "الزراعة المائية",
  "الاستشارات والدعم الزراعي",
  "دعم وتسويق منتجات المزارعين"
];

export const SAFETY = {
  pesticide: "ما نعطي جرعة مبيد أو نسبة خلط من غير اسم المنتج والملصق المسجل والمحصول/الاستخدام. المرجع الأساسي هو الملصق، مع معدات الوقاية وبعيدًا عن الأطفال.",
  fertilizer: "جرعات الأسمدة تعتمد على المنتج والمحصول والمرحلة وطريقة الري؛ ما نعطي رقم تخميني من غير بيانات كافية.",
  diagnosis: "تشخيص الإصابة عن بعد يحتاج اسم المحصول وصورة واضحة للأعراض ومكان الزراعة ومعلومات أساسية؛ ما نختار علاج عشوائي.",
  general: "إذا المعلومة مش مؤكدة من الموقع أو قاعدة بيانات MIG FARM، المساعد يقول إنها غير مؤكدة بدل ما يخترعها."
};

export const TONE = {
  greetingAr: [
    "هلا والله 👋 حياك في MIG FARM. شو أقدر أخدمك فيه؟",
    "صباح/مسا الخير 🌱 حياك. خبرني شو تحتاج وأنا أشوف لك الموجود.",
    "مرحبا بك 🌱 أنا وياك. تبا منتج معيّن ولا مساعدة في الاختيار؟",
    "هلا وغلا. خبرني شو تدور عليه وبساعدك بالموجود في MIG FARM.",
    "حياك الله 👋 اسألني عن المنتجات أو الأسعار أو الشحن أو أي شي في الموقع."
  ],
  acknowledgmentAr: [
    "تمام 👍 حاضرين.",
    "زين، أنا وياك. إذا تبا نكمل على نفس الموضوع قل لي.",
    "أوكي، تمام. شو الخطوة اللي بعدها؟"
  ],
  negativeAr: [
    "تمام، ما في مشكلة. إذا تبا نغير الموضوع أو ندور على خيار ثاني خبرني.",
    "ولا يهمك. قل لي شو البديل اللي تدور عليه وأنا أساعدك.",
    "تمام، نخلي هالنقطة. شو تبا بدلها؟"
  ],
  shippingAr: [
    "هيه، عندنا توصيل قياسي داخل الإمارات بـ {fee} درهم{place}. إذا عندك منتج معيّن اكتب اسمه وأنا أشيك لك.",
    "أكيد، التوصيل القياسي داخل الإمارات قيمته {fee} درهم{place}. وإذا تبا نكمل على منتج معيّن عطِني اسمه.",
    "التوصيل داخل الإمارات متوفر، ورسوم التوصيل القياسي {fee} درهم{place}."
  ],
  wellbeingAr: [
    "بخير دامك بخير 🌱 شو نضبط لك اليوم؟",
    "تمام الحمدلله، حاضرين. شو حاب تعرف؟",
    "بخير وعافية 😄 خبرني شو تحتاج من MIG FARM."
  ],
  thanksAr: [
    "العفو، حاضرين 🌱",
    "تسلم، أي وقت. إذا تبا شي ثاني أنا وياك.",
    "حياك الله، تحت أمرك في أي استفسار عن الموقع أو المنتجات."
  ],
  goodbyeAr: [
    "في أمان الله 🌱 ونشوفك على خير.",
    "حياك بأي وقت، يومك سعيد.",
    "مع السلامة، وإذا احتجت شي ارجع لي وأنا أساعدك."
  ],
  fallbackAr: [
    "أبغي أتأكد إني فاهمك صح قبل ما أعطيك معلومة غلط. عطِني تفصيل بسيط زيادة.",
    "وصلتني الفكرة بشكل جزئي، بس ما أبغي أخمّن. تقصد منتج، شحن، فرع، ولا خدمة؟",
    "ما قدرت أثبت الإجابة من بيانات MIG FARM بثقة. وضّح لي المقصود بكلمتين وأنا أكمل وياك."
  ],
  productFoundAr: [
    "حصلت لك هالخيارات في المتجر 👇",
    "هيه، لقيت لك نتائج مطابقة بالموقع 👇",
    "تمام، هذي أقرب المنتجات لطلبك من المتجر الحي 👇"
  ],
  noProductAr: [
    "ما حصلت نتيجة مطابقة بشكل مؤكد في المتجر الحي.",
    "دورت في المنتجات الحالية وما لقيت تطابق أقدر أأكد لك عليه.",
    "ما ظهر لي منتج مطابق بثقة حاليًا."
  ]
};

export const HUMAN_FAQ = [
  {
    key: "how_to_order",
    patterns: ["كيف اطلب","كيف أطلب","طريقة الطلب","طريقه الطلب","ابي اطلب","ابغي اطلب","عايز اطلب","how to order","place order"],
    answersAr: [
      "تقدر تختار المنتج من المتجر، تضيفه للسلة وتكمل بيانات الطلب. طرق الدفع المتاحة تظهر لك في خطوة الدفع نفسها، وإذا واجهك خيار ناقص كلم الفريق على واتساب.",
      "الطلب من الموقع بسيط: افتح المنتج، أضفه للسلة، راجع الكمية والعنوان وكمل الـCheckout. لو احتجت مساعدة في منتج أو كمية أنا أرتبها لك قبل ما تكمل."
    ]
  },
  {
    key: "price_final",
    patterns: ["السعر نهائي","السعر النهائي","هل السعر نهائي","final price"],
    answersAr: [
      "السعر اللي أعرضه لك آخذه من صفحة المنتج الحالية. الإجمالي النهائي للطلب يعتمد على السلة ورسوم التوصيل وأي عناصر تظهر في الـCheckout، فاعتمد الإجمالي هناك كمصدر نهائي."
    ]
  },
  {
    key: "stock_live",
    patterns: ["المخزون","كم باقي","كم الكميه","كم الكمية","stock quantity"],
    answersAr: [
      "أقدر أقول لك حالة التوفر اللي تظهر في المتجر، لكن رقم المخزون الدقيق ما أعطيه إلا إذا كان ظاهر فعليًا في صفحة المنتج. اكتب اسم المنتج وأنا أشيك لك."
    ]
  },
  {
    key: "bulk",
    patterns: ["جمله","جملة","كميه كبيره","كمية كبيرة","سعر جمله","سعر جملة","عرض سعر","quotation","bulk","wholesale"],
    answersAr: [
      "للكميات الكبيرة عطِني اسم المنتج والكمية والإمارة. أقدر أرتب لك البيانات، وبعدها الفريق يؤكد عرض السعر المناسب.",
      "أكيد، للكميات والجملة نحتاج 3 أشياء: اسم المنتج، الكمية، والإمارة. بعدها نوجّه الطلب للفريق للتسعير."
    ]
  },
  {
    key: "discount",
    patterns: ["خصم","عروض","عرض","كوبون","كود خصم","discount","coupon","offer"],
    answersAr: [
      "العروض ممكن تتغير، فما بقول لك خصم غير مؤكد. اكتب اسم المنتج وأنا أشوف السعر/العرض الظاهر حاليًا في المتجر.",
      "إذا فيه عرض ظاهر على المنتج أقدر أتعامل مع البيانات الحالية، بس ما أضمن كوبون أو خصم مش موجود بالموقع. قل لي اسم المنتج."
    ]
  },
  {
    key: "original_documents",
    patterns: ["اصلي","أصلي","اصليه","أصلية","شهاده","شهادة","منشأ","اعتماد","original","certificate"],
    answersAr: [
      "أقدر أعرض لك بيانات المنتج الموجودة في الموقع، لكن لو تحتاج شهادة منشأ أو اعتماد أو مستند رسمي لمنتج معيّن، الأفضل تطلبه من الفريق باسم المنتج بالضبط."
    ]
  },
  {
    key: "cancel_order",
    patterns: ["الغي الطلب","ألغي الطلب","الغاء الطلب","إلغاء الطلب","cancel order"],
    answersAr: [
      "ما أقدر أعدل طلب خاص من الشات العام. كلم الفريق بسرعة واذكر رقم الطلب عشان يشيكون إذا كان الإلغاء ما زال ممكن قبل التجهيز/الشحن."
    ]
  },
  {
    key: "order_status",
    patterns: ["وين طلبي","طلبي وين","حالة الطلب","حاله الطلب","تتبع الطلب","track order","order status"],
    answersAr: [
      "الشات العام ما عنده وصول لبيانات الطلبات الخاصة. كلم الفريق على واتساب برقم الطلب وهم يشيكون لك على الحالة."
    ]
  }
];

export function allSeedAliases(){
  return MIG_SEED_CATALOG.flatMap(item=>[item.nameAr,...(item.aliases||[])]);
}

export function allKnownProductNames(){
  return KNOWN_PRODUCT_KNOWLEDGE.flatMap(item=>[item.titleAr,...(item.names||[])]);
}
