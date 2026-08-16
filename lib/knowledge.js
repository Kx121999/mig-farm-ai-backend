import { normalizeAr } from "./utils.js";

export const BUSINESS = {
  brand: "MIG FARM",
  company: "MIG FOR AGRICULTURE",
  country: "United Arab Emirates",
  currency: "AED",
  email: process.env.MIG_EMAIL || "sales@migfarm.com",
  website: process.env.MIG_WEBSITE || "https://www.migfarm.com",
  whatsapp: process.env.MIG_WHATSAPP_URL || "https://wa.me/971581768215",
  delivery: {
    scope: "UAE",
    standardFee: Number(process.env.DELIVERY_FEE_AED || 13)
  },
  branches: {
    alAin: {
      ar: "العين",
      phone: process.env.MIG_ALAIN_PHONE || "+971 58 176 8215"
    },
    sharjah: {
      ar: "الشارقة",
      phone: process.env.MIG_SHARJAH_PHONE || "+971 54 702 5904"
    }
  },
  categories: [
    "البذور",
    "الأسمدة وتغذية النبات",
    "المبيدات",
    "الري والزراعة المائية",
    "الأدوات والمعدات",
    "البيوت المحمية",
    "الخدمات والاستشارات الزراعية"
  ]
};

const UAE_EMIRATES = [
  ["ابوظبي","أبوظبي"],
  ["دبي","دبي"],
  ["الشارقه","الشارقة"],
  ["عجمان","عجمان"],
  ["ام القيوين","أم القيوين"],
  ["راس الخيمه","رأس الخيمة"],
  ["الفجيره","الفجيرة"],
  ["العين","العين"]
];

const HOT_PEPPER = ["جمر","شهاب","شراره","شرارة","الكوس","jamra","shihab","sharara","kous"];
const SWEET_PEPPER = ["جميرا","البرشا","jumeirah","barsha"];

function isEnglish(locale){ return locale === "en"; }

function actionPage(label,url){
  return {type:"page",label,url};
}

function actionWhatsapp(locale="ar"){
  return {
    type:"whatsapp",
    label:isEnglish(locale)?"WhatsApp MIG FARM":"كلمنا واتساب",
    url:BUSINESS.whatsapp
  };
}

function cleanNumber(n){
  const value=Number(n);
  if(!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : String(Math.round(value*100)/100);
}

function normalized(message){ return normalizeAr(message); }

function detectEmirate(t){
  for(const [key,label] of UAE_EMIRATES){
    const bare=key.replace(/^ال/,"");
    const variants=[
      key,
      `ل${key}`,
      `ب${key}`,
      `لل${bare}`,
      `بال${bare}`,
      `فال${bare}`
    ];
    if(variants.some(v=>t.includes(v))) return label;
  }
  return "";
}

function onlyGreeting(t){
  return /^(هلا(?: والله)?|مرحبا|السلام عليكم|سلام|هاي|hello|hi|hey)[\s.!؟]*$/.test(t);
}

function asksHuman(t){
  return /(موظف|انسان|بني ادم|خدمه العملاء|خدمة العملاء|مندوب|human|agent|اكلم حد|كلم حد|كلم موظف|اتصل بموظف)/.test(t);
}

function asksShipping(t){
  return /(شحن|توصيل|دليفري|shipping|delivery|يوصل|توصلون|توصيلكم)/.test(t);
}

function asksDeliveryTime(t){
  return /(كم يوم|كام يوم|متى يوصل|متي يوصل|وقت التوصيل|مده الشحن|مدة الشحن|delivery time|how long)/.test(t);
}

function asksPayment(t){
  return /(دفع|الدفع|كاش|نقدي|بطاقه|بطاقة|فيزا|ماستر|cod|cash on delivery|payment)/.test(t);
}

function asksReturns(t){
  return /(استرجاع|استبدال|ارجاع|إرجاع|refund|return|exchange)/.test(t);
}

function asksPrivacy(t){
  return /(خصوصيه|خصوصية|privacy|بياناتي|البيانات الشخصيه|البيانات الشخصية)/.test(t);
}

function asksTerms(t){
  return /(الشروط|شروط|احكام|أحكام|terms|conditions)/.test(t);
}

function asksCookies(t){
  return /(كوكي|كوكيز|ملفات الارتباط|cookies?)/.test(t);
}

function asksBranches(t){
  return /(وينكم|وين موقعكم|فروع|الفروع|فرعكم|فرع|اقرب فرع|أقرب فرع|location|branches?)/.test(t);
}

function asksContact(t){
  return /(رقم|رقمكم|رقم التواصل|تواصل|اتصال|هاتف|واتساب|whatsapp|phone|contact|ايميل|ايميلكم|الإيميل|البريد)/.test(t);
}

function asksHours(t){
  return /(ساعات العمل|اوقات العمل|أوقات العمل|متى تفتحون|متي تفتحون|متى تسكرون|متي تسكرون|دوام|working hours|open now)/.test(t);
}

function asksCompany(t){
  return /(من نحن|منو انتم|مين انتم|عن الشركه|عن الشركة|عن mig farm|عن ميج فارم|company info|about us)/.test(t) ||
    /^(mig farm|ميج فارم)[\s.!؟]*$/.test(t);
}

function asksCategories(t){
  return /(شو عندكم|وش عندكم|ايش عندكم|ايه عندكم|إيه عندكم|شو تبيعون|وش تبيعون|اقسامكم|أقسامكم|منتجاتكم|what do you sell|categories)/.test(t);
}

function asksBeyondSeeds(t){
  return /(غير|بدون|ما عدا|بعيد عن).{0,22}(البذور|بذور)/.test(t) ||
    /(البذور|بذور).{0,22}(غيرها|غير|سواها|سوا)/.test(t);
}

function asksServices(t){
  return /(خدمات|استشارات|استشاره|استشارة|مهندس|مهندسين|services?|consult)/.test(t);
}

function asksGreenhouse(t){
  return /(بيت محمي|بيوت محميه|بيوت محمية|جرين هاوس|greenhouse)/.test(t);
}

function asksHydroponics(t){
  return /(زراعه مائيه|زراعة مائية|هيدروبونيك|hydroponic)/.test(t);
}

function asksIrrigation(t){
  return /(شبكه ري|شبكة ري|ري بالتنقيط|تنقيط|تايمر ري|مؤقت ري|irrigation|drip)/.test(t);
}

function asksTools(t){
  return /(ادوات|أدوات|معدات|مقص|دريل|منشار|متر|tools?|equipment)/.test(t);
}

function asksFertilizers(t){
  return /(سماد|اسمده|اسمدة|تغذيه النبات|تغذية النبات|fertili[sz]er|plant nutrition)/.test(t);
}

function asksPesticides(t){
  return /(مبيد|مبيدات|حشرات|حشره|حشرة|pesticide|insecticide)/.test(t);
}

function asksSeedCategory(t){
  return /(بذور|بذره|بذرة|seeds?)/.test(t);
}

function asksTax(t){
  return /(ضريبه|ضريبة|vat|tax|شامل الضريبه|شامل الضريبة|فاتوره ضريبيه|فاتورة ضريبية)/.test(t);
}

function asksOffers(t){
  return /(عرض|عروض|خصم|خصومات|كود خصم|كوبون|offer|offers|discount|coupon)/.test(t);
}

function asksOutsideUAE(t){
  return /(خارج الامارات|خارج الإمارات|السعوديه|السعودية|عمان|سلطنه عمان|سلطنة عمان|قطر|الكويت|البحرين|ksa|saudi|oman|qatar|kuwait|bahrain|international)/.test(t);
}

function asksPlantProblem(t){
  return /(النبات تعبان|النبات مريض|اصابه|إصابة|مرض نبات|اصفرار|اصفر|ذبول|بقع على|حشرات على|افات|آفات|مشكله في النبات|مشكلة في النبات|تشخيص|diagnos|plant problem)/.test(t);
}

function asksFertilizerUse(t){
  return /(كيف استخدم|كيف استعمل|طريقة استخدام|طريقه استخدام|جرعه|جرعة|كم ملي|كم مل|خلط)/.test(t) && asksFertilizers(t);
}

function asksOrderStatus(t){
  return /(طلبي|طلبى|الطلب حقي|حاله الطلب|حالة الطلب|وين الطلب|تتبع الطلب|order status|track order)/.test(t);
}

function asksBulkQuote(t){
  return /(جمله|جملة|كميه كبيره|كمية كبيرة|عرض سعر|كوتيشن|quotation|bulk|wholesale)/.test(t);
}

function asksPesticideDose(t){
  return /(جرعه|جرعة|كم ملي|كم مل|خلط|اخلط|استخدام المبيد|طريقة الاستخدام|طريقه الاستخدام|dose|dosage|mix rate)/.test(t) && asksPesticides(t);
}

function asksAgronomyAdvice(t){
  return /(ازرع|أزرع|موعد الزراعه|موعد الزراعة|متى ازرع|متي ازرع|انسب صنف|أنسب صنف|افضل صنف|أفضل صنف|مناسب للجو|مناسب للصيف|مناسب للشتاء|open field|greenhouse)/.test(t);
}

export function directKnowledgeReply(message, locale="ar"){
  const t=normalized(message);
  if(!t) return null;

  if(onlyGreeting(t)){
    return {
      reply:isEnglish(locale)?"Hi 👋 Welcome to MIG FARM. What can I help you with?":"هلا والله 👋 حياك في MIG FARM. شو حاب تعرف؟",
      source:"smalltalk",
      actions:[]
    };
  }

  if(/شلونك|كيفك|كيف الحال|علومك|شو اخبارك|شو أخبارك/.test(t)){
    return {
      reply:isEnglish(locale)?"Doing great, thanks 🌱 What can I help you with?":"بخير دامك بخير 🌱 شو أقدر أساعدك فيه اليوم؟",
      source:"smalltalk",
      actions:[]
    };
  }

  if(/شكرا|مشكور|تسلم|يعطيك العافيه|يعطيك العافية|thanks|thank you/.test(t)){
    return {
      reply:isEnglish(locale)?"You're welcome 🌱 I'm here if you need anything else.":"العفو، حاضرين 🌱 إذا تبا أي شي ثاني أنا وياك.",
      source:"smalltalk",
      actions:[]
    };
  }

  if(/منو انت|مين انت|انت مين|شو تسوي|شو وظيفتك|who are you/.test(t)){
    return {
      reply:isEnglish(locale)
        ?"I'm the MIG FARM website assistant. I can help with products, live prices and availability, categories, delivery, branches, services, site policies, and product comparisons."
        :"أنا مساعد MIG FARM للموقع. أقدر أساعدك بالمنتجات والأسعار والتوفر، الأقسام، الشحن، الفروع، الخدمات، سياسات الموقع، والمقارنة بين المنتجات.",
      source:"assistant_identity",
      actions:[]
    };
  }

  if(asksHuman(t)){
    return {
      reply:isEnglish(locale)?"Sure. You can contact the MIG FARM team directly on WhatsApp.":"أكيد، حاضرين. تقدر تكلم فريق MIG FARM مباشرة على واتساب.",
      source:"human_escalation",
      actions:[actionWhatsapp(locale)],
      escalation:true
    };
  }

  if(asksOrderStatus(t)){
    return {
      reply:isEnglish(locale)
        ?"I can't access private order records from this public website chat. Send the team your order number on WhatsApp and they can check it."
        :"ما أقدر أشوف بيانات الطلبات الخاصة من شات الموقع العام. أرسل رقم طلبك للفريق على واتساب وهم يشيكون لك عليه.",
      source:"order_status",
      actions:[actionWhatsapp(locale)],
      escalation:true
    };
  }

  if(asksShipping(t) && asksOutsideUAE(t)){
    return {
      reply:isEnglish(locale)
        ?"The currently configured standard delivery is for the UAE. I can't confirm international/GCC shipping from the site, so contact the team for the destination you need."
        :"الشحن القياسي المهيأ حاليًا داخل الإمارات. ما عندي تأكيد من الموقع على الشحن لدول الخليج أو خارج الإمارات، فالأفضل تكلم الفريق وتذكر الدولة المطلوبة.",
      source:"shipping_outside_uae",
      actions:[actionWhatsapp(locale)]
    };
  }

  if(asksShipping(t)){
    const emirate=detectEmirate(t);
    if(asksDeliveryTime(t)){
      return {
        reply:isEnglish(locale)
          ?`The exact delivery time is not confirmed in the information available to me. The standard UAE delivery fee is ${BUSINESS.delivery.standardFee} AED; for timing, contact the team with your emirate.`
          :`مدة التوصيل الدقيقة مب مؤكدة عندي من بيانات الموقع. رسوم التوصيل القياسي داخل الإمارات ${BUSINESS.delivery.standardFee} درهم، وللمدة حسب منطقتك كلم الفريق واذكر الإمارة.`,
        source:"delivery_time",
        actions:[actionWhatsapp(locale)]
      };
    }
    return {
      reply:isEnglish(locale)
        ?`Yes, standard delivery is available within the UAE for ${BUSINESS.delivery.standardFee} AED${emirate?` including ${emirate}`:""}.`
        :`هيه، التوصيل القياسي داخل الإمارات متوفر بـ ${BUSINESS.delivery.standardFee} درهم${emirate?`، ومنها ${emirate}`:""}. إذا تبا أساعدك بطلب منتج معيّن اكتب اسمه.`,
      source:"shipping",
      actions:[]
    };
  }

  if(asksHours(t)){
    return {
      reply:isEnglish(locale)
        ?"I don't have confirmed branch working hours in the current site information, so I won't guess. You can contact the team to confirm today's hours."
        :"أوقات الدوام مب مؤكدة عندي من معلومات الموقع الحالية، وما بقول لك وقت من عندي. تقدر تتأكد من الفريق مباشرة.",
      source:"hours_unconfirmed",
      actions:[actionWhatsapp(locale)]
    };
  }

  if(asksPayment(t)){
    return {
      reply:isEnglish(locale)
        ?"Available payment methods are shown during checkout. If no suitable method appears for your order, contact the team before completing the purchase."
        :"طرق الدفع المتاحة تظهر لك وقت إتمام الطلب. إذا ما ظهر لك خيار مناسب في الدفع، كلم الفريق قبل ما تكمل الطلب.",
      source:"payment",
      actions:[actionPage(isEnglish(locale)?"Open shop":"افتح المتجر","/shop"),actionWhatsapp(locale)]
    };
  }

  if(asksTax(t)){
    return {
      reply:isEnglish(locale)
        ?"I don't have confirmed VAT-inclusion information in the current assistant data. Use the final checkout total as the source of truth, or ask the team for a tax-invoice question."
        :"ما عندي تأكيد حاليًا إن السعر الظاهر شامل الضريبة أو لا، فما بضيف معلومة من عندي. اعتمد الإجمالي النهائي في الدفع، ولو سؤالك عن فاتورة ضريبية كلم الفريق.",
      source:"tax_unconfirmed",
      actions:[actionWhatsapp(locale)]
    };
  }

  if(asksOffers(t)){
    return {
      reply:isEnglish(locale)
        ?"Offers and discounts can change. I won't claim a discount unless it's shown in the live store. Tell me the product name and I can check what's currently listed."
        :"العروض والخصومات ممكن تتغير، فما بقول لك خصم إلا إذا كان ظاهر في المتجر. اكتب اسم المنتج وأنا أشيك لك الموجود حاليًا.",
      source:"offers",
      actions:[actionPage(isEnglish(locale)?"Open shop":"افتح المتجر","/shop")]
    };
  }

  if(asksReturns(t)){
    return {
      reply:isEnglish(locale)
        ?"For returns or exchanges, please check the Terms page for the current policy. I won't invent conditions that aren't confirmed."
        :"بالنسبة للاسترجاع أو الاستبدال، الأفضل نرجع لشروط الموقع الحالية عشان ما أعطيك شرط مب مؤكد.",
      source:"returns",
      actions:[actionPage(isEnglish(locale)?"Terms":"الشروط والأحكام","/terms"),actionWhatsapp(locale)]
    };
  }

  if(asksPrivacy(t)){
    return {
      reply:isEnglish(locale)?"You can review MIG FARM's current privacy policy on the Privacy Policy page.":"تقدر تراجع سياسة الخصوصية الحالية لـ MIG FARM من صفحة سياسة الخصوصية.",
      source:"privacy",
      actions:[actionPage(isEnglish(locale)?"Privacy Policy":"سياسة الخصوصية","/privacy-policy")]
    };
  }

  if(asksCookies(t)){
    return {
      reply:isEnglish(locale)?"You can review the site's cookie information on the Cookie Policy page.":"تقدر تراجع تفاصيل ملفات الارتباط من صفحة سياسة الكوكيز.",
      source:"cookies",
      actions:[actionPage(isEnglish(locale)?"Cookie Policy":"سياسة الكوكيز","/cookie-policy")]
    };
  }

  if(asksTerms(t)){
    return {
      reply:isEnglish(locale)?"You can review the current website terms on the Terms page.":"تقدر تراجع الشروط والأحكام الحالية من صفحة الشروط.",
      source:"terms",
      actions:[actionPage(isEnglish(locale)?"Terms":"الشروط والأحكام","/terms")]
    };
  }

  if(asksBranches(t)){
    if(t.includes("العين")){
      return {
        reply:isEnglish(locale)?`Al Ain branch contact: ${BUSINESS.branches.alAin.phone}.`:`فرع العين: ${BUSINESS.branches.alAin.phone}.`,
        source:"branch_alain",
        actions:[actionWhatsapp(locale)]
      };
    }
    if(t.includes("الشارقه")){
      return {
        reply:isEnglish(locale)?`Sharjah branch contact: ${BUSINESS.branches.sharjah.phone}.`:`فرع الشارقة: ${BUSINESS.branches.sharjah.phone}.`,
        source:"branch_sharjah",
        actions:[]
      };
    }
    return {
      reply:isEnglish(locale)
        ?`MIG FARM has branches in Al Ain and Sharjah. Al Ain: ${BUSINESS.branches.alAin.phone}. Sharjah: ${BUSINESS.branches.sharjah.phone}.`
        :`عندنا فرعين في الإمارات: العين ${BUSINESS.branches.alAin.phone} والشارقة ${BUSINESS.branches.sharjah.phone}. إذا تبا فرع معيّن قل لي أي واحد.`,
      source:"branches",
      actions:[]
    };
  }

  if(asksContact(t)){
    if(/ايميل|الإيميل|البريد|email/.test(t)){
      return {
        reply:isEnglish(locale)?`MIG FARM email: ${BUSINESS.email}.`:`إيميل MIG FARM هو ${BUSINESS.email}.`,
        source:"email",
        actions:[]
      };
    }
    if(t.includes("العين")){
      return {
        reply:isEnglish(locale)?`Al Ain: ${BUSINESS.branches.alAin.phone}.`:`رقم فرع العين: ${BUSINESS.branches.alAin.phone}.`,
        source:"contact_alain",
        actions:[actionWhatsapp(locale)]
      };
    }
    if(t.includes("الشارقه")){
      return {
        reply:isEnglish(locale)?`Sharjah: ${BUSINESS.branches.sharjah.phone}.`:`رقم فرع الشارقة: ${BUSINESS.branches.sharjah.phone}.`,
        source:"contact_sharjah",
        actions:[]
      };
    }
    return {
      reply:isEnglish(locale)
        ?`Al Ain: ${BUSINESS.branches.alAin.phone}. Sharjah: ${BUSINESS.branches.sharjah.phone}. Email: ${BUSINESS.email}.`
        :`تقدر تتواصل ويانا على فرع العين ${BUSINESS.branches.alAin.phone} أو فرع الشارقة ${BUSINESS.branches.sharjah.phone}، والإيميل ${BUSINESS.email}.`,
      source:"contact",
      actions:[actionWhatsapp(locale)]
    };
  }

  if(asksBeyondSeeds(t)){
    const categories=BUSINESS.categories.filter(x=>x!=="البذور").join("، ");
    return {
      reply:isEnglish(locale)
        ?"Besides seeds, MIG FARM offers fertilizers and plant nutrition, pesticides, irrigation and hydroponics supplies, tools and equipment, greenhouse solutions, and agricultural services."
        :`هيه أكيد 🌱 غير البذور عندنا ${categories}. قل لي أي قسم تبا وأنا أطلع لك الموجود.`,
      source:"categories_without_seeds",
      actions:[]
    };
  }

  if(asksCategories(t) && !asksProductCategoryTerm(t) && !asksServices(t)){
    return {
      reply:isEnglish(locale)
        ?"MIG FARM covers seeds, fertilizers and plant nutrition, pesticides, irrigation and hydroponics, tools and equipment, greenhouse solutions, and agricultural services."
        :`عند MIG FARM نغطي احتياجات الزراعة من ${BUSINESS.categories.join("، ")}. خبرني شو اللي تدور عليه وأنا أساعدك فيه.`,
      source:"categories",
      actions:[actionPage(isEnglish(locale)?"Open shop":"افتح المتجر","/shop")]
    };
  }

  if(asksCompany(t)){
    return {
      reply:isEnglish(locale)
        ?"MIG FARM is a UAE agricultural supplies business serving growers and projects with seeds, plant nutrition, irrigation, tools, greenhouse solutions and agricultural services."
        :"MIG FARM شركة متخصصة في مستلزمات وحلول الزراعة في الإمارات، من البذور وتغذية النبات والري والأدوات إلى البيوت المحمية والخدمات الزراعية.",
      source:"company",
      actions:[]
    };
  }

  if(asksBulkQuote(t)){
    return {
      reply:isEnglish(locale)
        ?"For a bulk quote, send the product name, required quantity and emirate. The team can then confirm the suitable offer."
        :"للكميات الكبيرة وعرض السعر، أرسل اسم المنتج والكمية المطلوبة والإمارة، والفريق يجهز لك العرض المناسب.",
      source:"bulk_quote",
      actions:[actionWhatsapp(locale)],
      escalation:true
    };
  }

  if(asksPlantProblem(t)){
    return {
      reply:isEnglish(locale)
        ?"For a plant problem, send the crop, a clear photo of the affected area, the symptoms and whether it's open field or greenhouse. That avoids guessing a treatment."
        :"لو عندك مشكلة في النبات، أرسل اسم المحصول وصورة واضحة للإصابة ووصف الأعراض ومكشوف ولا بيت محمي. بهالشكل ما نخمن علاج من غير تشخيص.",
      source:"plant_problem",
      actions:[actionWhatsapp(locale)]
    };
  }

  if(asksFertilizerUse(t)){
    return {
      reply:isEnglish(locale)
        ?"Fertilizer rates depend on the exact product and use. Send the product name or label and I can check the listed information; don't use a guessed dose."
        :"جرعة السماد وطريقة استخدامه تعتمد على المنتج نفسه. اكتب اسم السماد بالضبط أو أرسل الملصق، وما نعطي جرعة تخمينية.",
      source:"fertilizer_use_safety",
      actions:[actionWhatsapp(locale)]
    };
  }

  if(asksPesticideDose(t)){
    return {
      reply:isEnglish(locale)
        ?"I won't guess pesticide dosage or mixing rates. Send the exact product name or label; use only the registered label instructions, and the team can help verify the correct use."
        :"ما بعطيك جرعة مبيد أو نسبة خلط من عندي. أرسل اسم المبيد بالضبط أو صورة الملصق، والتزم بتعليمات الملصق المسجل، والفريق يقدر يساعدك يتأكد من الاستخدام الصحيح.",
      source:"pesticide_safety",
      actions:[actionWhatsapp(locale)]
    };
  }

  if(asksAgronomyAdvice(t) && !asksSeedCategory(t)){
    return {
      reply:isEnglish(locale)
        ?"I can help narrow it down. Tell me the crop, emirate, whether it's open field or greenhouse, and what result you're aiming for."
        :"أقدر أساعدك نضيّق الاختيار. قل لي المحصول، الإمارة، زراعة مكشوفة ولا بيت محمي، وشو النتيجة اللي تباها.",
      source:"agronomy_clarification",
      actions:[]
    };
  }

  if(asksServices(t) && !asksProductCategoryTerm(t)){
    return {
      reply:isEnglish(locale)
        ?"MIG FARM provides agricultural support and services alongside products, including greenhouse solutions and help choosing suitable supplies for the project."
        :"عند MIG FARM خدمات ودعم زراعي بجانب المنتجات، ومنها حلول البيوت المحمية والمساعدة في اختيار المستلزمات المناسبة للمشروع.",
      source:"services",
      actions:[actionPage(isEnglish(locale)?"Services":"الخدمات","/services"),actionWhatsapp(locale)]
    };
  }

  if(asksGreenhouse(t) && !/(بذور|سماد|مبيد)/.test(t)){
    return {
      reply:isEnglish(locale)
        ?"MIG FARM provides greenhouse solutions and project support. Tell me the emirate, approximate size and intended crop so the team can guide you properly."
        :"هيه، عندنا حلول وتجهيز بيوت محمية. أرسل الإمارة والمساحة التقريبية والمحصول اللي ناوي تزرعه عشان نوجّهك صح.",
      source:"greenhouse",
      actions:[actionWhatsapp(locale)]
    };
  }

  if(asksHydroponics(t) && !/(منتج|سعر|بكم|متوفر)/.test(t)){
    return {
      reply:isEnglish(locale)
        ?"MIG FARM covers irrigation and hydroponics supplies. Tell me whether you're looking for a full system, controller, timer, fittings or another specific item."
        :"عندنا مستلزمات للري والزراعة المائية. قل لي تبا نظام كامل، كنترول، تايمر، قطع ري، أو منتج معيّن وأنا أدور لك عليه.",
      source:"hydroponics",
      actions:[]
    };
  }

  if(asksIrrigation(t) && !/(منتج|سعر|بكم|متوفر)/.test(t)){
    return {
      reply:isEnglish(locale)
        ?"We carry irrigation supplies. Tell me what you're trying to control or connect, or name the item you need and I'll search the live store."
        :"عندنا مستلزمات ري. قل لي شو تبا تتحكم فيه أو توصله، أو اكتب اسم القطعة وأنا أدور لك عليها في المتجر.",
      source:"irrigation",
      actions:[]
    };
  }

  return null;
}

function asksProductCategoryTerm(t){
  return asksFertilizers(t) || asksPesticides(t) || asksTools(t) || asksSeedCategory(t) ||
    asksIrrigation(t) || asksHydroponics(t) || asksGreenhouse(t);
}

export function isProductIntent(message){
  const t=normalized(message);
  if(!t || asksBeyondSeeds(t) || asksShipping(t) || asksCompany(t) || asksBranches(t) ||
     asksPrivacy(t) || asksTerms(t) || asksCookies(t) || asksPayment(t) || asksReturns(t) ||
     asksHours(t) || asksOrderStatus(t)) return false;

  return asksProductCategoryTerm(t) ||
    /(طماطم|خيار|باذنجان|فلفل|بطيخ|شمام|كنتالوب|كوس|باميه|بامية|بصل|ذره|ذرة|فجل|شمندر|سبانخ|ملوخيه|ملوخية|روزماري|okra|tomato|cucumber|eggplant|pepper|watermelon|melon|zucchini|onion|corn|radish)/.test(t);
}

export function isProductFollowup(message){
  const t=normalized(message);
  return /^(طب|طيب|زين|اوكي|أوكي)?\s*(الحار|الحلو|ارخص|الارخص|اغلى|الاغلى|المتوفر|الموجود|متوفر|موجود|سعره|سعرها|بكم|بكام|تفاصيله|تفاصيلها|تفاصيل|فيهم|منهم|هذا|هذي|ده|دي|كم واحد|كام واحد|عددهم|اقل من|أقل من|فوق|تحت)/.test(t);
}

export function parseProductRows(history=[]){
  for(let i=history.length-1;i>=0;i--){
    const item=history[i];
    if(!item || item.role!=="assistant") continue;
    const text=String(item.content||"");
    if(!text.includes("•")) continue;

    const rows=[];
    const regex=/•\s*([^•\n]+?)\s*—\s*([0-9][0-9,.]*)\s*(AED|درهم)?(?:\s*-\s*([^\n•]+))?/g;
    let match;
    while((match=regex.exec(text))!==null){
      const price=Number(String(match[2]).replace(/,/g,""));
      if(Number.isFinite(price)){
        rows.push({
          name:match[1].trim(),
          price,
          currency:match[3]||"AED",
          status:(match[4]||"").trim()
        });
      }
    }
    if(rows.length) return rows;
  }
  return [];
}

function pepperKind(name){
  const t=normalized(name);
  if(HOT_PEPPER.some(x=>t.includes(normalized(x)))) return "hot";
  if(SWEET_PEPPER.some(x=>t.includes(normalized(x)))) return "sweet";
  return "";
}

function statusAvailable(row){
  const t=normalized(row.status);
  return !/(غير متوفر|out of stock|unavailable)/.test(t);
}

function requestedThreshold(t){
  const m=t.match(/(?:اقل من|أقل من|تحت|below|under)\s*([0-9]+(?:\.[0-9]+)?)/);
  if(m) return {op:"lt",value:Number(m[1])};
  const m2=t.match(/(?:اكثر من|أكثر من|فوق|above|over)\s*([0-9]+(?:\.[0-9]+)?)/);
  if(m2) return {op:"gt",value:Number(m2[1])};
  return null;
}

export function historyReply(message,history=[],locale="ar"){
  const rows=parseProductRows(history);
  if(!rows.length) return null;
  const t=normalized(message);
  const ar=!isEnglish(locale);

  const availableRows=rows.filter(statusAvailable);

  if((/ارخص|الارخص|cheapest|lowest/.test(t)) && (/متوفر|موجود|available|in stock/.test(t))){
    const pool=availableRows.length?availableRows:rows;
    const min=Math.min(...pool.map(x=>x.price));
    const matches=pool.filter(x=>x.price===min);
    return {
      reply:ar
        ?`أرخص منتج متوفر من اللي فوق ${cleanNumber(min)} درهم:\n${matches.map(x=>`• ${x.name}`).join("\n")}`
        :`The cheapest available option is ${cleanNumber(min)} AED:\n${matches.map(x=>`• ${x.name}`).join("\n")}`,
      source:"conversation_cheapest_available",
      actions:[]
    };
  }

  if(/رتب.*ارخص|من الارخص|من الأرخص|sort.*price/.test(t)){
    const sorted=[...rows].sort((a,b)=>a.price-b.price);
    return {
      reply:ar
        ?`مرتبين من الأرخص للأعلى:\n${sorted.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`
        :`Sorted from lowest to highest price:\n${sorted.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`,
      source:"conversation_price_sort",
      actions:[]
    };
  }

  const ordinalMap=[
    ["الاول",0],["الأول",0],["اول",0],["أول",0],["first",0],
    ["الثاني",1],["التاني",1],["ثاني",1],["second",1],
    ["الثالث",2],["التالت",2],["ثالث",2],["third",2],
    ["الرابع",3],["رابع",3],["fourth",3],
    ["الخامس",4],["خامس",4],["fifth",4]
  ];
  for(const [word,index] of ordinalMap){
    if(t.includes(normalized(word)) && rows[index]){
      const row=rows[index];
      return {
        reply:ar
          ?`${row.name} — ${cleanNumber(row.price)} AED${row.status?` - ${row.status}`:""}`
          :`${row.name} — ${cleanNumber(row.price)} AED${row.status?` - ${row.status}`:""}`,
        source:"conversation_ordinal",
        actions:[]
      };
    }
  }

  if(/قارن|مقارنه|مقارنة|الفرق|compare|difference/.test(t)){
    return {
      reply:ar
        ?`من ناحية السعر والتوفر في القائمة السابقة:\n${rows.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED${x.status?` - ${x.status}`:""}`).join("\n")}\nإذا تبا مقارنة المواصفات نفسها، اذكر لي اسم المنتجين بالضبط.`
        :`From the previous list, price and availability are:\n${rows.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED${x.status?` - ${x.status}`:""}`).join("\n")}\nFor a specification comparison, name the two products exactly.`,
      source:"conversation_compare",
      actions:[]
    };
  }

  if(/كم واحد|كام واحد|عددهم|how many/.test(t)){
    return {
      reply:ar?`اللي عرضتهم لك عددهم ${rows.length} منتجات.`:`I listed ${rows.length} products.`,
      source:"conversation_count",
      actions:[]
    };
  }

  if(/ارخص|الارخص|اقل سعر|cheapest|lowest/.test(t)){
    const min=Math.min(...rows.map(x=>x.price));
    const matches=rows.filter(x=>x.price===min);
    return {
      reply:ar
        ?`أرخص سعر من اللي فوق ${cleanNumber(min)} درهم:\n${matches.map(x=>`• ${x.name}`).join("\n")}`
        :`The lowest price is ${cleanNumber(min)} AED:\n${matches.map(x=>`• ${x.name}`).join("\n")}`,
      source:"conversation_cheapest",
      actions:[]
    };
  }

  if(/اغلى|الاغلى|اعلى سعر|most expensive|highest/.test(t)){
    const max=Math.max(...rows.map(x=>x.price));
    const matches=rows.filter(x=>x.price===max);
    return {
      reply:ar
        ?`أعلى سعر من اللي فوق ${cleanNumber(max)} درهم:\n${matches.map(x=>`• ${x.name}`).join("\n")}`
        :`The highest price is ${cleanNumber(max)} AED:\n${matches.map(x=>`• ${x.name}`).join("\n")}`,
      source:"conversation_highest",
      actions:[]
    };
  }

  if(/المتوفر|الموجود|المتاح|available|in stock/.test(t)){
    const available=rows.filter(statusAvailable);
    return {
      reply:available.length
        ? (ar?`المتوفر من اللي فوق:\n${available.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`:
              `Available from the list:\n${available.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`)
        : (ar?"ما ظهر لي منتج متوفر من القائمة السابقة.":"I couldn't confirm an available product from the previous list."),
      source:"conversation_available",
      actions:[]
    };
  }

  if(/الحار|hot/.test(t)){
    const matches=rows.filter(x=>pepperKind(x.name)==="hot");
    if(matches.length){
      return {
        reply:ar?`الحار من اللي فوق:\n${matches.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`:
          `Hot pepper options:\n${matches.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`,
        source:"conversation_hot",
        actions:[]
      };
    }
  }

  if(/الحلو|sweet/.test(t)){
    const matches=rows.filter(x=>pepperKind(x.name)==="sweet");
    if(matches.length){
      return {
        reply:ar?`الحلو من اللي فوق:\n${matches.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`:
          `Sweet pepper options:\n${matches.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`,
        source:"conversation_sweet",
        actions:[]
      };
    }
  }

  const threshold=requestedThreshold(t);
  if(threshold){
    const matches=rows.filter(x=>threshold.op==="lt"?x.price<threshold.value:x.price>threshold.value);
    return {
      reply:matches.length
        ? (ar?`المنتجات المطابقة:\n${matches.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`:
          `Matching products:\n${matches.map(x=>`• ${x.name} — ${cleanNumber(x.price)} AED`).join("\n")}`)
        : (ar?"ما في منتج من القائمة السابقة يطابق السعر اللي حددته.":"None of the previous products match that price range."),
      source:"conversation_price_filter",
      actions:[]
    };
  }

  return null;
}

export function pageReferenceIntent(message){
  const t=normalized(message);
  return /(هذا|هذي|ده|دي|هالمنتج|المنتج هذا|المنتج ده|سعره|سعرها|السعر|بكم|بكام|متوفر|موجود|تفاصيله|تفاصيلها|وش عنه|شو عنه)/.test(t);
}

export function currentProductReply(message,product,locale="ar"){
  if(!product || !pageReferenceIntent(message)) return null;
  const t=normalized(message);
  const ar=!isEnglish(locale);
  const name=product.name || (ar?"هالمنتج":"this product");
  const price=product.price ? `${product.price} ${product.currency||"AED"}` : (ar?"السعر مب ظاهر":"price not shown");
  const availability=product.availability || (ar?"التوفر مب واضح":"availability not shown");

  if(/سعر|بكم|بكام|كام/.test(t)){
    return {
      reply:ar?`${name} سعره ${price}.`:`${name} is ${price}.`,
      source:"current_product_price",
      actions:[]
    };
  }

  if(/متوفر|موجود|التوفر|available|stock/.test(t)){
    return {
      reply:ar?`${name}: ${availability}.`:`${name}: ${availability}.`,
      source:"current_product_availability",
      actions:[]
    };
  }

  const desc=String(product.description||"").trim();
  return {
    reply:ar
      ? `${name} — ${price}${availability?` - ${availability}`:""}${desc?`\n${desc.slice(0,500)}`:""}`
      : `${name} — ${price}${availability?` - ${availability}`:""}${desc?`\n${desc.slice(0,500)}`:""}`,
    source:"current_product_details",
    actions:[]
  };
}

export function productPostFilter(products,message){
  const t=normalized(message);
  let result=[...products];

  if(/فلفل/.test(t) && /حار|الحار|hot/.test(t)){
    const filtered=result.filter(p=>pepperKind(p.name)==="hot");
    if(filtered.length) result=filtered;
  }

  if(/فلفل/.test(t) && /حلو|الحلو|sweet/.test(t)){
    const filtered=result.filter(p=>pepperKind(p.name)==="sweet");
    if(filtered.length) result=filtered;
  }

  const threshold=requestedThreshold(t);
  if(threshold){
    const filtered=result.filter(p=>{
      const price=Number(p.price);
      return Number.isFinite(price) && (threshold.op==="lt"?price<threshold.value:price>threshold.value);
    });
    if(filtered.length) result=filtered;
  }

  if(/المتوفر|متوفر|موجود|available|in stock/.test(t)){
    const filtered=result.filter(p=>!/(غير متوفر|outofstock|out of stock)/.test(normalized(p.availability)));
    if(filtered.length) result=filtered;
  }

  return result;
}

export function productClarificationReply(message,locale="ar"){
  const t=normalized(message);
  if(/انسب|أنسب|افضل|أفضل|اختار|اختيار|recommend|best|choose/.test(t)){
    return {
      reply:isEnglish(locale)
        ?"I can help choose. Tell me the crop/product type, emirate, open field or greenhouse, and the approximate quantity. I won't ask for details you already gave me."
        :"أقدر أساعدك تختار. قل لي المحصول أو نوع المنتج، الإمارة، مكشوف ولا بيت محمي، والكمية التقريبية. وما بسألك عن معلومة إنت قلتها قبل.",
      source:"product_clarification",
      actions:[]
    };
  }
  return null;
}
