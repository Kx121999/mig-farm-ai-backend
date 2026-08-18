import { normalizeAr, tokenize } from "./utils.js";

const VERIFIED_AT="2026-08-17";
const VERSION="14.0";
export const UAE_AGRI_ENTRIES=[
  {
    "id": "law_quarantine_2025",
    "topic": "الحجر الزراعي",
    "keywords": [
      "الحجر الزراعي",
      "قانون الحجر",
      "استيراد نباتات",
      "آفات حجرية",
      "quarantine"
    ],
    "answer_ar": "القانون الاتحادي رقم 7 لسنة 2025 هو الإطار الاتحادي الأحدث للحجر الزراعي، ويهدف لمنع دخول وانتشار الآفات وحماية الموارد النباتية. ويغطي استيراد وتصدير وعبور النباتات والمنتجات النباتية والمواد الخاضعة للوائح الصحة النباتية.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_quarantine_2025",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/3995",
    "source_title": "القانون الاتحادي رقم 7 لسنة 2025 بشأن الحجر الزراعي",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": "Federal Law No. 7 of 2025",
    "warning": "تحقق من اللائحة التنفيذية والقرارات المحدثة قبل أي إجراء تجاري."
  },
  {
    "id": "law_quarantine_repeal",
    "topic": "إلغاء قانون الحجر القديم",
    "keywords": [
      "قانون 5 1979",
      "قانون الحجر القديم",
      "الغاء قانون الحجر"
    ],
    "answer_ar": "القانون الاتحادي رقم 7 لسنة 2025 نص على إلغاء القانون الاتحادي رقم 5 لسنة 1979 بشأن الحجر الزراعي، مع بقاء اللوائح والقرارات السابقة نافذة مؤقتاً بالقدر الذي لا يتعارض مع القانون الجديد إلى حين صدور ما يلزم لتنفيذه.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_quarantine_2025",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/3995",
    "source_title": "القانون الاتحادي رقم 7 لسنة 2025 بشأن الحجر الزراعي",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": "Federal Law No. 7 of 2025, Article 27",
    "warning": null
  },
  {
    "id": "law_quarantine_disclosure",
    "topic": "الإفصاح عند المنافذ",
    "keywords": [
      "افصاح نباتات",
      "الجمارك نباتات",
      "بذور مع مسافر",
      "ادخال شتلات"
    ],
    "answer_ar": "المواد الخاضعة للوائح الصحة النباتية أو الكائنات النافعة التي تدخل الدولة يجب الإفصاح عنها عند منفذ الدخول، ولا تُفرج المواد المحتجزة إلا بموافقة الجهة المختصة وفق القانون.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_quarantine_2025",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/3995",
    "source_title": "القانون الاتحادي رقم 7 لسنة 2025 بشأن الحجر الزراعي",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": "Federal Law No. 7 of 2025, Article 6",
    "warning": null
  },
  {
    "id": "law_quarantine_soil",
    "topic": "إدخال التربة والأسمدة العضوية غير المعالجة",
    "keywords": [
      "استيراد تربة",
      "ادخال تربة",
      "رمل زراعي",
      "سماد عضوي غير معالج"
    ],
    "answer_ar": "إدخال الرمل المستخدم للزراعة أو التربة الزراعية الطبيعية أو التربة المصاحبة للإرساليات، وكذلك الأسمدة العضوية غير المعالجة وغير المعقمة، محظور دون تصريح من الجهة المختصة وفق قانون الحجر الزراعي.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_quarantine_2025",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/3995",
    "source_title": "القانون الاتحادي رقم 7 لسنة 2025 بشأن الحجر الزراعي",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": "Federal Law No. 7 of 2025, Article 12",
    "warning": null
  },
  {
    "id": "law_pesticides_2020",
    "topic": "قانون المبيدات",
    "keywords": [
      "قانون المبيدات",
      "تداول المبيدات",
      "بيع مبيدات",
      "تسجيل مبيد",
      "مبيد غير مسجل"
    ],
    "answer_ar": "القانون الاتحادي رقم 10 لسنة 2020 ينظم المبيدات في الدولة. عملياً لا ينبغي اعتبار أي مبيد صالحاً للاستيراد أو التداول لمجرد وجوده تجارياً؛ يجب الرجوع إلى التسجيل والتصاريح والجهة المختصة.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_pesticides_2020",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1463",
    "source_title": "القانون الاتحادي رقم 10 لسنة 2020 بشأن المبيدات",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": "Federal Law No. 10 of 2020",
    "warning": null
  },
  {
    "id": "pesticide_import_registered",
    "topic": "استيراد المبيدات",
    "keywords": [
      "استيراد مبيد",
      "اذن استيراد مبيدات",
      "ارسالية مبيدات"
    ],
    "answer_ar": "خدمة وزارة التغير المناخي والبيئة لاستيراد المبيدات مخصصة لإرساليات مبيدات مسجلة لصالح المستورد لدى الوزارة، وتخضع الإرسالية للفحص والإفراج بعد التحقق من الاشتراطات.",
    "kind": "regulation",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_pesticide_import",
    "source_url": "https://www.moccae.gov.ae/ar/services/import-a-pesticide-consignment",
    "source_title": "استيراد إرسالية مبيدات",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": "الرسوم والمتطلبات التشغيلية قد تتغير؛ اعتمد صفحة الخدمة الحالية قبل الشحن."
  },
  {
    "id": "pesticide_prohibited_restricted",
    "topic": "المبيدات المحظورة والمقيدة",
    "keywords": [
      "مبيد محظور",
      "مبيد مقيد",
      "مبيدات ممنوعة"
    ],
    "answer_ar": "يوجد في التشريعات الإماراتية تنظيم للمبيدات المحظورة والمقيدة؛ بعض الأصناف يحظر استيرادها أو تداولها، وبعضها لا يسمح به إلا بتصريح وشروط إشراف فني. لا تُستنتج حالة المادة الفعالة من الذاكرة؛ يجب التحقق من القائمة الرسمية الحالية.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_pesticides_2020",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1463",
    "source_title": "القانون الاتحادي رقم 10 لسنة 2020 بشأن المبيدات",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": "حالة المواد الفعالة قابلة للتغيير بقرارات تنظيمية."
  },
  {
    "id": "pesticide_mrl_2024",
    "topic": "متبقيات المبيدات",
    "keywords": [
      "متبقيات المبيدات",
      "الحد الاقصى للمتبقيات",
      "mrl",
      "سلامة محصول"
    ],
    "answer_ar": "قرار مجلس الوزراء رقم 116 لسنة 2024 يتناول اللائحة الفنية للحدود القصوى لمتبقيات المبيدات في المنتجات الزراعية والغذائية. عند إنتاج أو تسويق محصول غذائي يجب مراعاة الملصق وفترة الأمان ومتطلبات المتبقيات المعمول بها.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_mrl_2024",
    "source_url": "https://uaelegislation.gov.ae/ar/legislations/2688",
    "source_title": "قرار مجلس الوزراء رقم 116 لسنة 2024 بشأن الحدود القصوى لمتبقيات المبيدات",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": "Cabinet Resolution No. 116 of 2024",
    "warning": null
  },
  {
    "id": "environment_pesticide_safeguards",
    "topic": "ضوابط استخدام المبيدات بيئياً",
    "keywords": [
      "رش مبيدات بيئة",
      "سلامة رش",
      "حماية المياه من المبيد"
    ],
    "answer_ar": "التشريع البيئي الاتحادي يشترط استيفاء الضوابط والاحتياطات عند رش أو استخدام المبيدات والمواد الكيميائية لتجنب الإضرار بالإنسان والحيوان والنبات والمياه ومكونات البيئة.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_environment",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1146",
    "source_title": "القانون الاتحادي بشأن حماية البيئة وتنميتها",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "fertilizer_law",
    "topic": "قانون الأسمدة والمصلحات",
    "keywords": [
      "قانون الاسمدة",
      "تداول اسمدة",
      "مصلحات زراعية",
      "استيراد سماد"
    ],
    "answer_ar": "القانون الاتحادي رقم 39 لسنة 1992 ينظم إنتاج واستيراد وتداول الأسمدة والمصلحات الزراعية، ويتطلب موافقة مسبقة من الجهة المختصة على الأنشطة الخاضعة له، مع استثناءات محددة للبحث وإعادة التصدير.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_fertilizers_1992",
    "source_url": "https://uaelegislation.gov.ae/ar/legislations/1142",
    "source_title": "القانون الاتحادي رقم 39 لسنة 1992 بشأن الأسمدة والمصلحات الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": "Federal Law No. 39 of 1992",
    "warning": null
  },
  {
    "id": "fertilizer_unrestricted_import",
    "topic": "استيراد الأسمدة غير المقيدة",
    "keywords": [
      "سماد غير مقيد",
      "استيراد اسمدة غير مقيدة"
    ],
    "answer_ar": "وزارة التغير المناخي والبيئة توفر خدمة لإذن استيراد الأسمدة والمصلحات الزراعية غير المقيدة ثم فحص الإرسالية وتحليلها عند الحاجة والإفراج عنها بعد التحقق من المطابقة.",
    "kind": "regulation",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_fert_unrestricted",
    "source_url": "https://www.moccae.gov.ae/ar/services/import-unrestricted-fertilizers-and-agricultural-conditioners",
    "source_title": "استيراد أسمدة ومصلحات زراعية غير مقيدة",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "fertilizer_restricted_import",
    "topic": "استيراد الأسمدة المقيدة",
    "keywords": [
      "سماد مقيد",
      "اسمدة مقيدة",
      "موافقة امنية سماد"
    ],
    "answer_ar": "الأسمدة أو المواد الخام المقيدة تخضع لمسار اعتماد خاص يشمل التنسيق للحصول على الموافقة الأمنية، ثم إذن الاستيراد والفحص والإفراج وفق خدمة الوزارة الحالية.",
    "kind": "regulation",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_fert_restricted",
    "source_url": "https://www.moccae.gov.ae/ar/services/import-of-restricted-fertilizers-and-agricultural-conditioners",
    "source_title": "استيراد أسمدة ومصلحات زراعية مقيدة",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "seed_import_permit",
    "topic": "استيراد البذور والتقاوي",
    "keywords": [
      "استيراد بذور",
      "استيراد تقاوي",
      "اذن بذور",
      "شحنة بذور"
    ],
    "answer_ar": "استيراد البذور والتقاوي يتطلب ترخيص نشاط زراعي مناسب، والحصول على إذن الاستيراد قبل شحن الإرسالية، ولا يجوز إدخال أصناف غير مذكورة في الإذن. كما تُفحص الإرسالية عند الوصول قبل الإفراج.",
    "kind": "regulation",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_import_agri",
    "source_url": "https://www.moccae.gov.ae/ar/services/import-an-agricultural-consignment",
    "source_title": "خدمة استيراد إرسالية زراعية",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "seed_import_packaging",
    "topic": "عبوات البذور المستوردة",
    "keywords": [
      "عبوات بذور",
      "تغليف بذور استيراد"
    ],
    "answer_ar": "من اشتراطات خدمة استيراد الإرسالية الزراعية أن تكون عبوات البذور والتقاوي مناسبة للحفاظ على حيوية البذور ومنع تلفها؛ صفحة الخدمة تذكر أمثلة لعبوات معدنية غير قابلة للصدأ أو ورقية مبطنة بالألمنيوم أو مواد مناسبة مثل البلاستيك والخيش.",
    "kind": "regulation",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_import_agri",
    "source_url": "https://www.moccae.gov.ae/ar/services/import-an-agricultural-consignment",
    "source_title": "خدمة استيراد إرسالية زراعية",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "agri_activity_license",
    "topic": "ترخيص النشاط الزراعي",
    "keywords": [
      "ترخيص نشاط زراعي",
      "مشتل",
      "استشارات زراعية",
      "مكافحة افات نشاط",
      "استيراد وتصدير بذور"
    ],
    "answer_ar": "ترخيص مزاولة النشاط الزراعي الاتحادي يغطي أنشطة محددة مثل المشتل والاستشارات الزراعية ومكافحة الآفات والإرشاد الزراعي واستيراد وتصدير البذور والتقاوي والنباتات والأشتال. صفحة الخدمة الحالية تذكر أن الموافقة صالحة سنة من تاريخ الإصدار.",
    "kind": "regulation",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_license",
    "source_url": "https://moccae.gov.ae/ar/services/permit-for-agricultural-activity-practice-new",
    "source_title": "ترخيص مزاولة نشاط زراعي",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": "قد تكون هناك متطلبات محلية إضافية حسب الإمارة والنشاط والرخصة الاقتصادية."
  },
  {
    "id": "farm_registration",
    "topic": "تسجيل الحيازة الزراعية",
    "keywords": [
      "تسجيل مزرعة",
      "حيازة زراعية",
      "بطاقة مزرعة"
    ],
    "answer_ar": "تسجيل الحيازة الزراعية لدى الوزارة مخصص لتسجيل بيانات مزرعة الحائز المواطن للاستفادة من خدمات الوزارة، ويتضمن إنشاء الطلب ومعاينة المزرعة ثم التسجيل الإلكتروني.",
    "kind": "regulation",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_license",
    "source_url": "https://moccae.gov.ae/ar/services/permit-for-agricultural-activity-practice-new",
    "source_title": "ترخيص مزاولة نشاط زراعي",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": "راجع خدمة تسجيل الحيازة الحالية للمستندات والأهلية التفصيلية."
  },
  {
    "id": "organic_rules",
    "topic": "الزراعة العضوية",
    "keywords": [
      "عضوي",
      "زراعة عضوية",
      "organic",
      "بذور عضوية"
    ],
    "answer_ar": "تنظيم الإنتاج العضوي في الإمارات يضع قيوداً على المدخلات. اللائحة التنفيذية تذكر أن استخدام الكائنات المحورة وراثياً ومشتقاتها كمدخلات عضوية محظور، وأن الأسمدة والمبيدات الكيميائية لا تستخدم داخل وحدات الإنتاج العضوي وفق الضوابط الواردة فيها.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_organic_reg",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1140",
    "source_title": "اللائحة التنفيذية للمدخلات والمنتجات العضوية",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "organic_seed_exception",
    "topic": "البذور في الإنتاج العضوي",
    "keywords": [
      "بذور تقليدية عضوي",
      "بذور غير عضوية في مزرعة عضوية"
    ],
    "answer_ar": "إذا لم تتوفر بذور عضوية أو عند إدخال أصناف جديدة، تسمح اللائحة باستخدام بذور تقليدية بشروط وبعد موافقة الوزارة، على أن تكون غير معالجة كيميائياً وغير محورة وراثياً.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_organic_reg",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1140",
    "source_title": "اللائحة التنفيذية للمدخلات والمنتجات العضوية",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "plant_variety_protection",
    "topic": "حماية الأصناف النباتية",
    "keywords": [
      "حماية صنف نباتي",
      "صنف جديد",
      "حقوق مربي النباتات"
    ],
    "answer_ar": "توجد خدمة اتحادية لحماية الأصناف النباتية الجديدة وفق القانون الاتحادي رقم 17 لسنة 2009، وتشمل فحصاً شكلياً وفنياً للتحقق من استيفاء متطلبات الحماية.",
    "kind": "regulation",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": "Federal Law No. 17 of 2009",
    "warning": null
  },
  {
    "id": "gmo_biosafety",
    "topic": "السلامة الأحيائية والكائنات المحورة",
    "keywords": [
      "gmo",
      "كائنات محورة",
      "بذور معدلة وراثيا",
      "هندسة وراثية"
    ],
    "answer_ar": "الإمارات لديها إطار اتحادي للسلامة الأحيائية للكائنات المحورة وراثياً ومنتجاتها، لذلك أي سؤال تجاري عن استيراد أو تداول مادة محورة وراثياً يحتاج تحققاً من التشريع والقرارات التنفيذية الحالية وليس افتراضاً عاماً.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_organic_reg",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1140",
    "source_title": "اللائحة التنفيذية للمدخلات والمنتجات العضوية",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": "Federal Law No. 9 of 2020 / Cabinet Resolution No. 84 of 2022",
    "warning": null
  },
  {
    "id": "phytosanitary_certificate",
    "topic": "شهادة الصحة النباتية",
    "keywords": [
      "شهادة صحة نباتية",
      "تصدير نباتات",
      "phytosanitary"
    ],
    "answer_ar": "الإرساليات الزراعية المصدرة أو المعاد تصديرها تخضع لمتطلبات الصحة النباتية للدولة المستوردة، ويعالج قانون الحجر الزراعي شهادة الصحة النباتية كوثيقة رسمية تثبت استيفاء الاشتراطات المطلوبة.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_quarantine_2025",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/3995",
    "source_title": "القانون الاتحادي رقم 7 لسنة 2025 بشأن الحجر الزراعي",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "beneficial_organisms",
    "topic": "استيراد الكائنات النافعة",
    "keywords": [
      "كائنات نافعة",
      "مفترسات حيوية",
      "مكافحة حيوية استيراد"
    ],
    "answer_ar": "الكائنات النافعة تدخل ضمن نطاق قانون الحجر الزراعي، وقد تخضع للاستيراد أو التقييد أو التصريح وفق قرارات الوزارة وتحليل مخاطر الآفات. لا يُنصح بإدخالها دون مسار رسمي.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_quarantine_2025",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/3995",
    "source_title": "القانون الاتحادي رقم 7 لسنة 2025 بشأن الحجر الزراعي",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "legal_freshness",
    "topic": "تحديث القوانين والرسوم",
    "keywords": [
      "احدث قانون",
      "رسوم",
      "هل القانون ساري",
      "اشتراطات حاليا"
    ],
    "answer_ar": "المعلومات التنظيمية يجب معاملتها كمعلومة مؤرخة. عند سؤال العميل عن رسوم أو مستندات أو حالة مادة مبيد أو إجراء استيراد، يجب الرجوع لصفحة الخدمة أو منصة تشريعات الإمارات الحالية قبل اتخاذ الإجراء.",
    "kind": "regulation",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_quarantine_2025",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/3995",
    "source_title": "القانون الاتحادي رقم 7 لسنة 2025 بشأن الحجر الزراعي",
    "verified_at": "2026-08-17",
    "freshness": "regulatory",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "authority_federal",
    "topic": "الجهة الاتحادية الزراعية",
    "keywords": [
      "وزارة الزراعة",
      "وزارة التغير المناخي",
      "moccae",
      "الجهة الزراعية الاتحادية"
    ],
    "answer_ar": "وزارة التغير المناخي والبيئة جهة اتحادية رئيسية في خدمات وتنظيمات الزراعة والصحة النباتية والحجر الزراعي، مع وجود جهات محلية مختصة في كل إمارة.",
    "kind": "authority",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "current",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "authority_abudhabi",
    "topic": "الزراعة في أبوظبي والعين",
    "keywords": [
      "ابوظبي زراعة",
      "العين زراعة",
      "adafsa",
      "هيئة ابوظبي للزراعة"
    ],
    "answer_ar": "هيئة أبوظبي للزراعة والسلامة الغذائية هي الجهة المحلية المختصة بالزراعة والسلامة الغذائية والأمن الغذائي والأمن الحيوي في إمارة أبوظبي، وتشمل مسؤولياتها الرقابة والتفتيش والتراخيص والبرامج الزراعية وفق التشريعات.",
    "kind": "authority",
    "authority": "ADAFSA",
    "emirate": "Abu Dhabi",
    "source_id": "adafsa",
    "source_url": "https://ghars.adafsa.gov.ae/ADAFSA/AboutUs",
    "source_title": "هيئة أبوظبي للزراعة والسلامة الغذائية",
    "verified_at": "2026-08-17",
    "freshness": "current",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "authority_sharjah",
    "topic": "الزراعة في الشارقة",
    "keywords": [
      "الشارقة زراعة",
      "دائرة الزراعة الشارقة",
      "مليحة",
      "الذيد"
    ],
    "answer_ar": "دائرة الزراعة والثروة الحيوانية في الشارقة تضع السياسات والخطط الزراعية والحيوانية في الإمارة، وتعمل على تطوير استخدام مياه الري وترشيدها والرقابة على المنشآت والمزارع المرتبطة باختصاصها.",
    "kind": "authority",
    "authority": "Sharjah Department of Agriculture and Livestock",
    "emirate": "Sharjah",
    "source_id": "sharjah_dal",
    "source_url": "https://dal.shj.ae/ar",
    "source_title": "دائرة الزراعة والثروة الحيوانية بالشارقة",
    "verified_at": "2026-08-17",
    "freshness": "current",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "authority_dubai",
    "topic": "الزراعة في دبي",
    "keywords": [
      "دبي زراعة",
      "بلدية دبي زراعة",
      "مكافحة افات حدائق دبي"
    ],
    "answer_ar": "بلدية دبي تنشر التشريعات والخدمات المحلية ذات الصلة، ومنها خدمات مكافحة الآفات للحدائق المنزلية وبعض التنظيمات البيئية والصحية. الأنشطة التجارية قد تتطلب أيضاً موافقات اتحادية ومحلية أخرى حسب النشاط.",
    "kind": "authority",
    "authority": "Dubai Municipality",
    "emirate": "Dubai",
    "source_id": "dubai_dm_leg",
    "source_url": "https://www.dm.gov.ae/municipality-business/general-legislations/",
    "source_title": "التشريعات العامة ببلدية دبي",
    "verified_at": "2026-08-17",
    "freshness": "current",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "authority_rak",
    "topic": "الزراعة في رأس الخيمة",
    "keywords": [
      "راس الخيمة زراعة",
      "رأس الخيمة تصريح زراعي",
      "rak agriculture"
    ],
    "answer_ar": "حكومة رأس الخيمة توفر خدمات محلية مرتبطة بالنشاط الزراعي، ومنها خدمة تصريح نشاط زراعي لدى البلدية وفق الشروط المنشورة للخدمة.",
    "kind": "authority",
    "authority": "Ras Al Khaimah Government",
    "emirate": "Ras Al Khaimah",
    "source_id": "rak_agri_permit",
    "source_url": "https://www.rak.ae/wps/portal/rak/home/citizens/housing/buildingandconstruction/agriculturalactivity",
    "source_title": "تصريح نشاط زراعي في رأس الخيمة",
    "verified_at": "2026-08-17",
    "freshness": "current",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "authority_fujairah",
    "topic": "الزراعة في الفجيرة",
    "keywords": [
      "الفجيرة زراعة",
      "دائرة الاشغال والزراعة الفجيرة"
    ],
    "answer_ar": "دائرة الأشغال العامة والزراعة في الفجيرة تشمل ضمن اختصاصاتها الزراعة والمشاتل وإدارة الحدائق، وتضع ضمن أهدافها تطوير منظومة زراعية مستدامة قائمة على الابتكار.",
    "kind": "authority",
    "authority": "Fujairah Public Works & Agriculture Department",
    "emirate": "Fujairah",
    "source_id": "fujairah_pwad",
    "source_url": "https://pwad.fujairah.ae/en/about",
    "source_title": "دائرة الأشغال العامة والزراعة بالفجيرة",
    "verified_at": "2026-08-17",
    "freshness": "current",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "uae_climate",
    "topic": "مناخ الإمارات والزراعة",
    "keywords": [
      "مناخ الامارات",
      "حرارة الزراعة",
      "الصيف الامارات"
    ],
    "answer_ar": "الإمارات تقع في نطاق جاف؛ من أبرز تحديات الزراعة قلة الأمطار وارتفاع الحرارة وضعف خصوبة كثير من الأراضي وندرة المجاري المائية الطبيعية. لذلك إدارة الماء والملوحة والحرارة عناصر أساسية في أي خطة زراعية.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "desert_soil",
    "topic": "التربة الرملية",
    "keywords": [
      "تربة رملية",
      "رملية",
      "تحسين التربة"
    ],
    "answer_ar": "التربة الرملية الشائعة في البيئات الجافة سريعة الصرف وضعيفة الاحتفاظ بالماء والعناصر، لذلك تحتاج إدارة ري متقاربة ومدروسة وتحسيناً للمادة العضوية وتحليلاً فعلياً للتربة قبل بناء برنامج تسميد.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "salinity",
    "topic": "الملوحة",
    "keywords": [
      "ملوحة",
      "ec عالي",
      "مياه مالحة",
      "ملوحة التربة"
    ],
    "answer_ar": "الملوحة من تحديات الزراعة المعروفة في الإمارات. يجب فصل تشخيص ملوحة ماء الري عن ملوحة التربة بقياسات EC وتحليل مناسب؛ زيادة الري عشوائياً ليست بديلاً عن معرفة مصدر الملوحة وكفاءة الصرف.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "water_scarcity",
    "topic": "ترشيد مياه الري",
    "keywords": [
      "ترشيد المياه",
      "مياه الري",
      "استهلاك المياه"
    ],
    "answer_ar": "ترشيد المياه محور أساسي في الزراعة الإماراتية، وتدعم الجهات الرسمية التوسع في نظم الري الحديثة والزراعة الذكية والمائية لرفع كفاءة استخدام الماء.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "drip_irrigation",
    "topic": "الري بالتنقيط",
    "keywords": [
      "تنقيط",
      "ري بالتنقيط",
      "drip"
    ],
    "answer_ar": "الري بالتنقيط مناسب لإدارة الماء بدقة في ظروف الإمارات، لكن نجاحه يعتمد على تصميم الشبكة وضغط التشغيل وتصريف النقاطات والترشيح والصيانة ومطابقة زمن الري لاحتياج النبات والتربة والطقس.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "smart_irrigation",
    "topic": "الري الذكي",
    "keywords": [
      "ري ذكي",
      "حساس رطوبة",
      "تايمر ري",
      "weather controller"
    ],
    "answer_ar": "الري الذكي يمكن أن يعتمد على حساسات رطوبة التربة ووحدات تحكم وصمامات آلية وبيانات الطقس لتقليل الهدر وتحسين توقيت الري، مع ضرورة معايرة النظام للظروف الفعلية للمزرعة.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "hydroponics",
    "topic": "الزراعة المائية",
    "keywords": [
      "هيدروبونيك",
      "زراعة مائية",
      "بدون تربة",
      "hydroponic"
    ],
    "answer_ar": "الزراعة المائية من التقنيات الملائمة لبيئة الإمارات لأنها تسمح بإدارة الماء والمغذيات بدقة وتقليل الاعتماد على التربة، لكنها تحتاج متابعة EC وpH وحرارة المحلول والأكسجة والنظافة وجودة الماء.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "greenhouse",
    "topic": "البيوت المحمية",
    "keywords": [
      "بيت محمي",
      "بيوت محمية",
      "greenhouse"
    ],
    "answer_ar": "في البيوت المحمية بالإمارات لا يكفي الهيكل وحده؛ إدارة التهوية والتبريد والتظليل والرطوبة والري وجودة المياه أهم محددات النجاح، خصوصاً مع ارتفاع الحرارة الخارجية.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "greenhouse_heat",
    "topic": "حرارة البيت المحمي",
    "keywords": [
      "حرارة البيت المحمي",
      "تبريد بيت محمي",
      "صيف بيت محمي"
    ],
    "answer_ar": "ارتفاع الحرارة داخل البيت المحمي قد يسبب ضعف العقد والإجهاد وزيادة الطلب المائي. الاختيار بين التبريد التبخيري والتهوية والتظليل يعتمد على الموسم والرطوبة ونوع البيت والمحصول.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "greenhouse_humidity",
    "topic": "رطوبة البيت المحمي",
    "keywords": [
      "رطوبة بيت محمي",
      "تكاثف",
      "رطوبة عالية"
    ],
    "answer_ar": "الرطوبة المرتفعة مع ضعف حركة الهواء ترفع مخاطر بعض الأمراض الفطرية والتكاثف؛ الإدارة الجيدة تجمع بين التهوية والري في توقيت مناسب وكثافة نباتية تسمح بحركة الهواء.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "protected_water_factor",
    "topic": "احتياجات الماء في الزراعة المحمية",
    "keywords": [
      "ماء بيت محمي",
      "احتياج الري بيت محمي"
    ],
    "answer_ar": "إرشادات منشورة لدى ADAFSA تستخدم في بعض جداولها معامل 0.7 للاحتياج المائي عند الزراعة المحمية بالشبك أو البلاستيك مقارنة بالحقل في تلك الأمثلة. هذا معامل إرشادي في سياق محدد وليس رقماً ثابتاً لكل محصول أو مزرعة.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "irrigation_efficiency",
    "topic": "كفاءة شبكة الري",
    "keywords": [
      "كفاءة الري",
      "ضغط شبكة الري",
      "توزيع الري"
    ],
    "answer_ar": "عند حساب كمية الري لا بد من مراعاة كفاءة توزيع الشبكة. بعض إرشادات ADAFSA تستخدم 85% كقيمة تقديرية في أمثلة حسابية، لكن القيمة الحقيقية يجب قياسها أو تقديرها من حالة الشبكة وتجانس التصريف.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "salinity_leaching",
    "topic": "غسيل الأملاح",
    "keywords": [
      "غسيل الاملاح",
      "leaching",
      "صرف التربة"
    ],
    "answer_ar": "غسيل الأملاح يحتاج وجود صرف مناسب ومعرفة ملوحة الماء والتربة. بعض أمثلة ADAFSA تضيف نسبة تقديرية للتغسيل، لكنها ليست جرعة عامة؛ النسبة المطلوبة تتغير حسب المحصول والماء والتربة.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "soil_test",
    "topic": "تحليل التربة",
    "keywords": [
      "تحليل تربة",
      "فحص تربة"
    ],
    "answer_ar": "قبل برنامج تسميد قوي يفضل تحليل pH وEC والعناصر الأساسية وقوام التربة والمادة العضوية، لأن أعراض النقص والملوحة ومشاكل الجذور قد تتشابه بصرياً.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "water_test",
    "topic": "تحليل مياه الري",
    "keywords": [
      "تحليل مياه",
      "مياه بئر",
      "فحص ماء الري"
    ],
    "answer_ar": "تحليل مياه الري مهم خصوصاً عند استخدام مياه الآبار؛ من المؤشرات العملية EC وpH والبيكربونات والصوديوم والكلوريد ونسب بعض العناصر، ثم تُبنى المعالجة والخلط على نتيجة التحليل لا التخمين.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "ph_ec",
    "topic": "إدارة pH وEC",
    "keywords": [
      "ph",
      "ec",
      "حموضة المحلول",
      "ملوحة المحلول"
    ],
    "answer_ar": "في التسميد عبر الري والزراعة المائية، pH يؤثر في إتاحة العناصر وEC يعكس تركيز الأملاح الكلي. القيم المناسبة تختلف باختلاف المحصول والمرحلة والنظام، لذلك لا يوجد رقم واحد يصلح لكل الحالات.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "fertigation",
    "topic": "التسميد مع الري",
    "keywords": [
      "تسميد مع الري",
      "fertigation",
      "حقن سماد"
    ],
    "answer_ar": "التسميد مع الري يسمح بتقسيم الاحتياج الغذائي على دفعات وتحسين الكفاءة، لكنه يحتاج حساب تركيز المحلول وتوافق الأسمدة وجودة الماء وعدم خلط مركبات قد تترسب معاً في خزان مركز.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "fertilizer_compatibility",
    "topic": "توافق الأسمدة",
    "keywords": [
      "خلط اسمدة",
      "توافق الاسمدة",
      "كالسيوم فوسفات"
    ],
    "answer_ar": "عند تحضير محاليل مركزة لا ينبغي خلط مصادر الكالسيوم عشوائياً مع الفوسفات أو الكبريتات في نفس الخزان المركز لأن الترسيب قد يسد الشبكة ويقلل استفادة النبات؛ استخدم جداول التوافق وتعليمات الشركة.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "nitrogen_balance",
    "topic": "النيتروجين",
    "keywords": [
      "نيتروجين",
      "نمو خضري زائد"
    ],
    "answer_ar": "زيادة النيتروجين قد تعطي نمواً خضرياً مفرطاً وتؤثر في توازن النبات، بينما النقص يضعف النمو. القرار يجب أن يعتمد على مرحلة المحصول وتحليل التربة/الماء وحالة النبات لا على لون الورق وحده.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "potassium_role",
    "topic": "البوتاسيوم",
    "keywords": [
      "بوتاسيوم",
      "تزهير وثمار"
    ],
    "answer_ar": "البوتاسيوم مهم لتنظيم الماء وجودة الثمار والعديد من العمليات الفسيولوجية، لكن وصفه كـ«سماد تزهير» فقط تبسيط زائد؛ التوازن مع النيتروجين والكالسيوم والمغنيسيوم وباقي العناصر هو الأهم.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "calcium_role",
    "topic": "الكالسيوم",
    "keywords": [
      "كالسيوم",
      "عفن الطرف الزهري"
    ],
    "answer_ar": "مشاكل مثل عفن الطرف الزهري ترتبط بتوفر الكالسيوم داخل الثمرة وبانتظام الماء والنمو، وليس فقط بكمية الكالسيوم المضافة. تذبذب الري والملوحة والنمو السريع قد تزيد المشكلة.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "micronutrients",
    "topic": "العناصر الصغرى",
    "keywords": [
      "حديد",
      "زنك",
      "بورون",
      "عناصر صغرى"
    ],
    "answer_ar": "العناصر الصغرى مطلوبة بكميات قليلة لكن زيادتها قد تكون سامة. تشخيص النقص يتأثر بـpH والملوحة وحالة الجذور، لذلك يفضل التحقق قبل تكرار الرش أو الإضافة.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "heat_stress",
    "topic": "الإجهاد الحراري",
    "keywords": [
      "اجهاد حراري",
      "حر شديد",
      "ذبول الظهر"
    ],
    "answer_ar": "في الحر قد يذبل النبات مؤقتاً رغم وجود رطوبة لأن الفقد المائي يتجاوز قدرة الجذور على الامتصاص. افحص رطوبة منطقة الجذور والملوحة والتهوية قبل زيادة الري تلقائياً.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "sunscald",
    "topic": "لفحة الشمس",
    "keywords": [
      "لفحة شمس",
      "حروق شمس ثمار"
    ],
    "answer_ar": "تعرض الثمار المباشر لشمس قوية وحرارة مرتفعة قد يسبب أضراراً سطحية. إدارة المجموع الخضري والتظليل المناسب وتقليل الإجهاد المائي تساعد، مع تجنب تظليل مفرط يرفع الرطوبة أو يقلل الضوء أكثر من اللازم.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "wind_stress",
    "topic": "الرياح",
    "keywords": [
      "رياح قوية",
      "حماية من الرياح"
    ],
    "answer_ar": "الرياح الجافة قد ترفع النتح وتجرح النباتات وتحرك الرمال. مصدات الرياح والتدعيم وتصميم البيت/الشبك تساعد، مع الانتباه ألا تمنع التهوية الضرورية كلياً.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "transplanting",
    "topic": "شتل الخضروات",
    "keywords": [
      "شتل",
      "نقل شتلات",
      "تقسية الشتلات"
    ],
    "answer_ar": "عند نقل الشتلات للظروف الخارجية الحارة يجب تقليل صدمة النقل عبر تقسية تدريجية، ري مناسب قبل وبعد النقل، وحماية مؤقتة عند الحاجة، مع تجنب دفن منطقة الساق بشكل غير مناسب للمحصول.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "mulch",
    "topic": "التغطية الأرضية",
    "keywords": [
      "ملش",
      "تغطية التربة",
      "mulch"
    ],
    "answer_ar": "التغطية الأرضية قد تقلل تبخر الماء ونمو الحشائش وتغير حرارة التربة. نوع ولون وسمك الغطاء وموعد الاستخدام يجب أن يتناسب مع الموسم والمحصول وحرارة التربة في الإمارات.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "ipm",
    "topic": "المكافحة المتكاملة",
    "keywords": [
      "مكافحة متكاملة",
      "ipm",
      "افات"
    ],
    "answer_ar": "المكافحة المتكاملة تبدأ بالوقاية والمراقبة والتشخيص الصحيح والعتبة المناسبة، ثم استخدام الوسائل الزراعية والميكانيكية والحيوية والكيميائية عند الحاجة. اختيار مبيد دون تشخيص قد يرفع التكلفة ويضر الأعداء الحيوية.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "pest_scouting",
    "topic": "رصد الآفات",
    "keywords": [
      "فحص افات",
      "رصد حشرات",
      "مصائد لاصقة"
    ],
    "answer_ar": "الفحص الدوري للسطح السفلي للأوراق والنموات الحديثة والثمار والمصائد يساعد على اكتشاف الإصابة مبكراً وتحديد هل المشكلة حشرية أو مرضية أو تغذوية قبل اتخاذ قرار المكافحة.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "pesticide_label",
    "topic": "ملصق المبيد",
    "keywords": [
      "ملصق المبيد",
      "جرعة مبيد",
      "فترة امان"
    ],
    "answer_ar": "جرعة المبيد والمحصول المستهدف وفترة الأمان وعدد الرشات ومعدات الوقاية يجب أخذها من الملصق المسجل وتعليمات الجهة المختصة. لا يجوز للشات اختراع جرعة من اسم المادة فقط.",
    "kind": "agronomy",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_pesticides_2020",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1463",
    "source_title": "القانون الاتحادي رقم 10 لسنة 2020 بشأن المبيدات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "spray_timing",
    "topic": "توقيت الرش",
    "keywords": [
      "رش وقت الحر",
      "رش وقت الظهر",
      "توقيت مبيد"
    ],
    "answer_ar": "الحرارة والرياح قد تؤثر في كفاءة وأمان الرش؛ يُتبع ملصق المنتج وتجنب الظروف التي تزيد الانجراف أو الإجهاد النباتي، مع مراعاة حماية العمال والنحل والمناطق الحساسة.",
    "kind": "agronomy",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_environment",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1146",
    "source_title": "القانون الاتحادي بشأن حماية البيئة وتنميتها",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "bee_safety",
    "topic": "سلامة النحل",
    "keywords": [
      "نحل مبيدات",
      "حماية الملقحات"
    ],
    "answer_ar": "عند مكافحة الآفات في محصول مزهر يجب مراعاة الملقحات واتباع تحذيرات الملصق واختيار التوقيت وطريقة التطبيق التي تقلل تعرض النحل، وعدم افتراض أن المبيد آمن للنحل دون بيانات.",
    "kind": "agronomy",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_pesticides_2020",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1463",
    "source_title": "القانون الاتحادي رقم 10 لسنة 2020 بشأن المبيدات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "disease_triangle",
    "topic": "الأمراض النباتية",
    "keywords": [
      "مرض فطري",
      "مرض بكتيري",
      "اعراض نبات"
    ],
    "answer_ar": "تشخيص المرض يعتمد على العائل والمسبب والبيئة. الرطوبة والحرارة وإصابات الجذور قد تغير الأعراض، لذلك صورة واحدة قد لا تكفي لتحديد المسبب أو اختيار مبيد.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "root_rot",
    "topic": "أعفان الجذور",
    "keywords": [
      "عفن جذور",
      "جذور بنية",
      "اختناق جذور"
    ],
    "answer_ar": "أعفان الجذور قد ترتبط بمسببات مرضية أو سوء صرف أو ري زائد أو ملوحة. أول خطوة هي فحص الجذور ورطوبة الوسط والصرف قبل زيادة المبيدات أو الأسمدة.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "powdery_mildew",
    "topic": "البياض الدقيقي",
    "keywords": [
      "بياض دقيقي",
      "مسحوق ابيض ورق"
    ],
    "answer_ar": "البياض الدقيقي مجموعة أمراض فطرية تظهر غالباً كمسحوق أبيض على الأوراق، لكن تأكيد المحصول وشكل الإصابة مهم لأن برنامج المكافحة والمبيدات المسجلة يختلف حسب المحصول والمسبب.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "whitefly",
    "topic": "الذبابة البيضاء",
    "keywords": [
      "ذبابة بيضاء",
      "whitefly"
    ],
    "answer_ar": "الذبابة البيضاء قد تسبب ضرراً مباشراً وتنقل فيروسات في بعض المحاصيل. الإدارة الفعالة تشمل النظافة الزراعية والرصد والمصائد وإدارة الأعشاب والبدائل الحيوية/الكيميائية المسجلة مع تدوير مجموعات المقاومة.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "thrips",
    "topic": "التربس",
    "keywords": [
      "تربس",
      "thrips"
    ],
    "answer_ar": "التربس صغير الحجم وقد يسبب خدوشاً وتشوهات وينقل فيروسات في بعض المحاصيل. التشخيص بالمصائد والفحص المبكر مهم، وبرنامج المكافحة يجب أن يراعي تدوير المواد الفعالة المسجلة.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "mites",
    "topic": "الأكاروس",
    "keywords": [
      "عنكبوت احمر",
      "اكاروس",
      "mites"
    ],
    "answer_ar": "الأكاروسات قد تتزايد بسرعة في الجو الحار والجاف؛ تظهر تنقيطاً أو برونزة على الأوراق وقد توجد خيوط دقيقة. لا تستخدم مبيداً حشرياً عاماً على افتراض أنه سيعالج الأكاروس؛ يلزم تشخيص واختيار مادة مسجلة مناسبة.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "tomato_uae",
    "topic": "الطماطم في الإمارات",
    "keywords": [
      "طماطم الامارات",
      "زراعة طماطم"
    ],
    "answer_ar": "الطماطم حساسة للإجهاد الحراري الشديد خصوصاً في التزهير والعقد، ولذلك تتغير جدوى الحقل المكشوف والبيت المحمي حسب الموسم والإمارة. اسأل عن موعد الزراعة ونظام الحماية قبل ترشيح الصنف.",
    "kind": "agronomy",
    "authority": "Sharjah Department of Agriculture and Livestock",
    "emirate": "UAE",
    "source_id": "sharjah_dal",
    "source_url": "https://dal.shj.ae/ar",
    "source_title": "دائرة الزراعة والثروة الحيوانية بالشارقة",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "cucumber_uae",
    "topic": "الخيار في الإمارات",
    "keywords": [
      "خيار الامارات",
      "زراعة خيار"
    ],
    "answer_ar": "الخيار سريع النمو وحساس لتذبذب الماء والحرارة والملوحة. في البيوت المحمية يجب الانتباه للتهوية والرطوبة والآفات مثل الذبابة البيضاء والتربس والأكاروس، واختيار الصنف حسب الموسم والنظام.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "pepper_uae",
    "topic": "الفلفل في الإمارات",
    "keywords": [
      "فلفل الامارات",
      "زراعة فلفل"
    ],
    "answer_ar": "الفلفل يحتاج حرارة مناسبة لكن الحرارة الشديدة قد تؤثر في العقد وجودة الثمار. انتظام الري والكالسيوم وإدارة التظليل والتهوية مهمة، ويجب اختيار الصنف حسب حار/حلو وموسم ونظام الزراعة.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "eggplant_uae",
    "topic": "الباذنجان في الإمارات",
    "keywords": [
      "باذنجان الامارات",
      "زراعة باذنجان"
    ],
    "answer_ar": "الباذنجان أكثر تحملاً للحرارة نسبياً من بعض الخضروات، لكن الإنتاج والجودة يتأثران بالملوحة والري والآفات. اختيار الصنف وشكل الثمرة والسوق المستهدف جزء من قرار البذور.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "okra_uae",
    "topic": "البامية في الإمارات",
    "keywords": [
      "بامية الامارات",
      "زراعة بامية"
    ],
    "answer_ar": "البامية محصول دافئ يمكنه التعامل مع الحرارة أفضل من محاصيل شتوية كثيرة، لكن توقيت الزراعة والري وجودة البذرة والكثافة تؤثر في الإنبات والإنتاج.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "melon_uae",
    "topic": "الشمام في الإمارات",
    "keywords": [
      "شمام الامارات",
      "كنتالوب",
      "زراعة شمام"
    ],
    "answer_ar": "الشمام يحتاج حرارة وضوء لكنه يتأثر بالملوحة ومشاكل الجذور والبياضات والحشرات الناقلة للفيروسات. إدارة الري قرب النضج واختيار الهجين حسب الموسم والسوق من أهم قرارات الإنتاج.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "watermelon_uae",
    "topic": "البطيخ في الإمارات",
    "keywords": [
      "بطيخ الامارات",
      "زراعة بطيخ"
    ],
    "answer_ar": "البطيخ محصول دافئ، لكن نجاحه التجاري يحتاج تربة جيدة الصرف وماء مناسب واختيار صنف وعقد جيد وإدارة آفات وأمراض القرعيات. لا يوصى بصنف بناءً على الاسم فقط دون موسم ومساحة وطريقة زراعة.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "zucchini_uae",
    "topic": "الكوسة في الإمارات",
    "keywords": [
      "كوسة الامارات",
      "زراعة كوسة"
    ],
    "answer_ar": "الكوسة سريعة النمو وقد تتأثر بالفيروسات والبياض الدقيقي والذبابة البيضاء. في الإمارات يفيد اختيار هجن تحمل مقاومات موثقة وإدارة الحشرات الناقلة ومراقبة الحرارة.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "leafy_uae",
    "topic": "الورقيات في الإمارات",
    "keywords": [
      "خس",
      "سبانخ",
      "جرجير",
      "ورقيات الامارات"
    ],
    "answer_ar": "كثير من الورقيات تفضل الأجواء الأبرد؛ الحرارة المرتفعة قد تسرع التزهير أو تقلل الجودة. الزراعة المحمية والتظليل والتبريد قد تمد الموسم لكن القرار يعتمد على المحصول المحدد.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "root_crops_uae",
    "topic": "المحاصيل الجذرية",
    "keywords": [
      "فجل",
      "شمندر",
      "لفت",
      "جزر الامارات"
    ],
    "answer_ar": "المحاصيل الجذرية تحتاج تربة مفككة جيدة الصرف وملوحة تحت السيطرة. الإفراط في النيتروجين أو التربة المتصلبة قد يؤثر في شكل الجذور، وتناسبها عادة الأجواء المعتدلة أكثر من الحر الشديد.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "onion_uae",
    "topic": "البصل",
    "keywords": [
      "بصل الامارات",
      "زراعة بصل"
    ],
    "answer_ar": "البصل يتأثر بطول النهار والصنف والموسم؛ اختيار بذرة غير مناسبة للمنطقة قد يؤدي إلى تكوين أبصال ضعيف حتى لو كان النمو الخضري جيداً. ينبغي استخدام صنف موصى به للظروف المحلية.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "home_garden",
    "topic": "الزراعة المنزلية",
    "keywords": [
      "حديقة منزلية",
      "زراعة منزلية",
      "سطح البيت"
    ],
    "answer_ar": "للزراعة المنزلية في الإمارات ركز على حجم الوعاء والصرف وموقع الشمس وجودة ماء الري والحماية من حر الظهيرة في الصيف. الأصص الصغيرة تجف وتسخن أسرع من تربة المزرعة.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "community_agriculture",
    "topic": "الزراعة المجتمعية",
    "keywords": [
      "زراعة مجتمعية",
      "سطح مدرسة",
      "حدائق مجتمعية"
    ],
    "answer_ar": "الزراعة المجتمعية معترف بها ضمن توجهات الدولة لاستغلال المساحات المتاحة مثل الأماكن السكنية وأسطح المباني والمؤسسات التعليمية، مع التركيز على كفاءة استخدام الماء والممارسات الذكية.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "sustainable_agriculture",
    "topic": "الزراعة المستدامة",
    "keywords": [
      "زراعة مستدامة",
      "استدامة زراعية",
      "امن غذائي"
    ],
    "answer_ar": "السياسات الإماراتية تشجع الزراعة المستدامة والذكية مناخياً، ورفع كفاءة استخدام الأرض والماء، وتبني الزراعة بدون تربة والعضوية والتقنيات الحديثة بما يدعم الأمن الغذائي.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "farm_support",
    "topic": "دعم المزارعين",
    "keywords": [
      "دعم مزارعين",
      "مواد دعم",
      "خصم مزارع"
    ],
    "answer_ar": "وزارة التغير المناخي والبيئة لديها خدمة دعم لمزارع مؤهلة وفق شروط منشورة، وتشمل معايير مثل تسجيل المزرعة وإنتاجيتها، وتُعطى أولوية ضمن المعايير لبعض المزارع العضوية والبيوت المحمية والنخيل المسوق.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_support",
    "source_url": "https://www.moccae.gov.ae/ar/services/support-farmers",
    "source_title": "طلب مواد دعم للمزارعين",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "extension_service",
    "topic": "الإرشاد الزراعي الحكومي",
    "keywords": [
      "ارشاد زراعي",
      "مهندس زراعي وزارة",
      "زيارة مزرعة"
    ],
    "answer_ar": "خدمة الإرشاد الزراعي الحكومية للمزارع المسجلة تشمل مجالات وقاية النبات والري والتسميد وأنظمة الزراعة، ويمكن أن تتضمن زيارة ميدانية للحيازة وفق الخدمة المنشورة.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "postharvest",
    "topic": "ما بعد الحصاد",
    "keywords": [
      "ما بعد الحصاد",
      "تبريد محصول",
      "تخزين خضار"
    ],
    "answer_ar": "في مناخ حار، سرعة خفض حرارة المنتج بعد الحصاد والمحافظة على سلسلة تبريد مناسبة تقللان فقد الجودة. طريقة التبريد والرطوبة والتخزين تختلف حسب المحصول ولا ينبغي تعميم درجة واحدة على الجميع.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "food_safety_produce",
    "topic": "سلامة المنتج الزراعي",
    "keywords": [
      "سلامة خضار",
      "منتج زراعي غذائي",
      "غسيل المحصول"
    ],
    "answer_ar": "عند بيع محصول للاستهلاك الغذائي يجب الجمع بين الممارسات الزراعية الجيدة ومتطلبات سلامة الغذاء ومتبقيات المبيدات والنظافة والتداول بعد الحصاد، وليس التركيز على الإنتاجية فقط.",
    "kind": "agronomy",
    "authority": "ADAFSA",
    "emirate": "UAE",
    "source_id": "adafsa",
    "source_url": "https://ghars.adafsa.gov.ae/ADAFSA/AboutUs",
    "source_title": "هيئة أبوظبي للزراعة والسلامة الغذائية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "recordkeeping",
    "topic": "سجلات المزرعة",
    "keywords": [
      "سجل الرش",
      "سجل التسميد",
      "سجلات مزرعة"
    ],
    "answer_ar": "الاحتفاظ بسجل للري والتسميد والرش ومصدر المدخلات وتواريخ الحصاد يساعد في تتبع المشاكل وحساب التكلفة والالتزام بفترات الأمان وتحسين القرارات الموسم التالي.",
    "kind": "agronomy",
    "authority": "ADAFSA",
    "emirate": "UAE",
    "source_id": "adafsa",
    "source_url": "https://ghars.adafsa.gov.ae/ADAFSA/AboutUs",
    "source_title": "هيئة أبوظبي للزراعة والسلامة الغذائية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "diagnosis_photo",
    "topic": "تشخيص من صورة",
    "keywords": [
      "شخص المرض من الصورة",
      "صورة نبات",
      "تشخيص اصابة"
    ],
    "answer_ar": "الصورة تساعد في تضييق الاحتمالات لكنها لا تثبت دائماً المسبب. التشخيص الأقوى يجمع صورة واضحة للورقة من الجهتين والجذور/الساق عند الحاجة، المحصول والعمر وطريقة الري والبيئة وتاريخ المعاملات.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "crop_rotation",
    "topic": "الدورة الزراعية",
    "keywords": [
      "دورة زراعية",
      "تكرار نفس المحصول"
    ],
    "answer_ar": "تكرار نفس العائلة النباتية في نفس المكان قد يزيد ضغط بعض الآفات والأمراض ومشاكل التربة. الدورة الزراعية مع نظافة المخلفات واختيار عائلات مختلفة تساعد ضمن برنامج إدارة متكامل.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "seed_quality",
    "topic": "جودة البذور",
    "keywords": [
      "نسبة انبات",
      "نقاوة بذور",
      "تخزين بذور"
    ],
    "answer_ar": "قرار شراء البذور يجب أن يراجع الصنف والهجين ونسبة الإنبات والنقاوة والمعاملة والتخزين وتاريخ العبوة، وليس السعر فقط. التخزين الحار والرطب قد يخفض الحيوية.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_import_agri",
    "source_url": "https://www.moccae.gov.ae/ar/services/import-an-agricultural-consignment",
    "source_title": "خدمة استيراد إرسالية زراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "seed_storage",
    "topic": "تخزين البذور",
    "keywords": [
      "تخزين بذور",
      "حرارة تخزين البذور"
    ],
    "answer_ar": "البذور عموماً تحافظ على حيويتها أفضل في ظروف جافة وباردة مناسبة للصنف والعبوة. لا تنقل رقم حرارة من صنف إلى آخر دون ملصق الشركة، خصوصاً للبذور المعاملة.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_import_agri",
    "source_url": "https://www.moccae.gov.ae/ar/services/import-an-agricultural-consignment",
    "source_title": "خدمة استيراد إرسالية زراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "nursery_hygiene",
    "topic": "نظافة المشتل",
    "keywords": [
      "مشتل شتلات",
      "تعقيم صواني",
      "نظافة مشتل"
    ],
    "answer_ar": "نظافة الصواني والوسط والأدوات ومياه الري وفصل الشتلات المصابة تقلل انتقال الأمراض في المشتل. استخدام تربة أو مادة عضوية غير موثوقة قد يدخل آفات أو مسببات مرضية.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "shade_net",
    "topic": "شبك التظليل",
    "keywords": [
      "شبك تظليل",
      "نسبة تظليل"
    ],
    "answer_ar": "التظليل يقلل الإشعاع والحرارة لكنه قد يخفض التمثيل الضوئي ويرفع الرطوبة إذا زاد. النسبة المناسبة تختلف حسب المحصول والموسم ونوع الشبك، لذلك لا يوجد رقم واحد مثالي لكل مزرعة.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "evaporative_cooling",
    "topic": "التبريد التبخيري",
    "keywords": [
      "باد وفان",
      "تبريد تبخيري",
      "مراوح بيت محمي"
    ],
    "answer_ar": "كفاءة التبريد التبخيري تعتمد على الرطوبة الخارجية وتدفق الهواء ومساحة الوسادة والمراوح وصيانة النظام. في الرطوبة العالية تقل قدرة النظام على خفض الحرارة مقارنة بالهواء الجاف.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "waterlogging",
    "topic": "التغريق",
    "keywords": [
      "ري زائد",
      "تغريق",
      "ماء راكد"
    ],
    "answer_ar": "الري الزائد لا يعني ماء أكثر للنبات؛ قد يقلل أكسجين الجذور ويزيد أعفان الجذور وغسل العناصر. افحص الصرف ورطوبة منطقة الجذور وتصريف النقاطات قبل تعديل البرنامج.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "irrigation_scheduling",
    "topic": "جدولة الري",
    "keywords": [
      "جدول ري",
      "كم مرة اسقي",
      "مدة الري"
    ],
    "answer_ar": "جدولة الري في الإمارات يجب أن تتغير مع الموسم وحجم النبات والتربة ونظام الزراعة وتصريف النقاطات وجودة الماء. سؤال «كم دقيقة؟» لا يملك جواباً دقيقاً دون هذه البيانات.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "water_budget",
    "topic": "حساب استهلاك الماء",
    "keywords": [
      "حساب ماء مزرعة",
      "كمية ماء دونم",
      "احتياج مائي"
    ],
    "answer_ar": "لحساب استهلاك الماء يلزم مساحة وعدد النباتات/الأشجار وتصريف النقاطات وعددها وكفاءة الشبكة والطقس والمحصول والمرحلة. يمكن إعطاء تقدير فقط إذا عُرفت هذه المتغيرات.",
    "kind": "agronomy",
    "authority": "ADAFSA Ghars",
    "emirate": "UAE",
    "source_id": "adafsa_ghars",
    "source_url": "https://ghars.adafsa.gov.ae/",
    "source_title": "منصة غرس للمعرفة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "open_vs_protected",
    "topic": "مكشوف أم محمي",
    "keywords": [
      "مكشوف ولا محمي",
      "open field greenhouse"
    ],
    "answer_ar": "الاختيار بين المكشوف والمحمي في الإمارات يعتمد على الموسم والمحصول والميزانية والهدف السوقي. المحمي يعطي تحكماً أكبر لكنه يحتاج تبريد وتهوية وإدارة أعلى وتكلفة تشغيلية أكبر.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "seasonality",
    "topic": "الموسمية",
    "keywords": [
      "موسم الزراعة الامارات",
      "متى ازرع",
      "موعد زراعة"
    ],
    "answer_ar": "الحرارة هي العامل الموسمي الأهم لكثير من خضروات الإمارات؛ محاصيل عديدة تكون أسهل في الموسم الأبرد بينما المحاصيل الدافئة تتحمل الفترات الانتقالية أكثر. للحصول على موعد دقيق يجب تحديد الإمارة والمحصول ومكشوف/محمي والصنف.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "legal_vs_agronomy",
    "topic": "الفرق بين القانون والنصيحة",
    "keywords": [
      "هل هذا قانون",
      "هل لازم",
      "ممنوع",
      "مسموح"
    ],
    "answer_ar": "المساعد يميز بين «معلومة زراعية عملية» و«متطلب قانوني». كلمات مثل ممنوع/إلزامي/تصريح/ترخيص لا تُستخدم كحكم قانوني إلا إذا كانت مدعومة بمصدر حكومي محدد وحديث.",
    "kind": "agronomy",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_quarantine_2025",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/3995",
    "source_title": "القانون الاتحادي رقم 7 لسنة 2025 بشأن الحجر الزراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "decision_emirate",
    "topic": "تحديد الإمارة",
    "keywords": [
      "اي امارة",
      "الامارة"
    ],
    "answer_ar": "قبل إعطاء نصيحة تنظيمية أو موعد/ظروف زراعية دقيقة في الإمارات، تحديد الإمارة مهم لأن الجهة المحلية والخدمات والحرارة والرطوبة قد تختلف.",
    "kind": "agronomy",
    "authority": "UAE Government Portal",
    "emirate": "UAE",
    "source_id": "uae_agriculture",
    "source_url": "https://u.ae/information-and-services/environment-and-energy/agriculture",
    "source_title": "الزراعة في دولة الإمارات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "decision_system",
    "topic": "تحديد نظام الزراعة",
    "keywords": [
      "مكشوف محمي مائي",
      "طريقة الزراعة"
    ],
    "answer_ar": "الترشيح الزراعي القوي يحدد أولاً: مكشوف أم بيت محمي أم زراعة مائية أم أصص؛ لأن الري والتبريد والأصناف وبرنامج التغذية تختلف جذرياً.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "decision_water",
    "topic": "تحديد مصدر المياه",
    "keywords": [
      "مصدر المياه",
      "ماء بئر",
      "ماء تحلية"
    ],
    "answer_ar": "مصدر مياه الري وEC من أهم البيانات قبل توصية تسميد أو محصول، خصوصاً مع مياه الآبار أو الخلط.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_extension",
    "source_url": "https://moccae.gov.ae/ar/services/agricultural-extension",
    "source_title": "طلب إرشاد زراعي",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "decision_market",
    "topic": "تحديد هدف السوق",
    "keywords": [
      "سوق",
      "بيع المحصول",
      "تسويق"
    ],
    "answer_ar": "إذا كان الهدف تجارياً، اختيار الصنف لا يعتمد على الإنتاجية فقط؛ يراعى شكل الثمرة والحجم والتحمل بعد الحصاد وطلب السوق واستمرارية التوريد.",
    "kind": "agronomy",
    "authority": "Sharjah Department of Agriculture and Livestock",
    "emirate": "UAE",
    "source_id": "sharjah_dal",
    "source_url": "https://dal.shj.ae/ar",
    "source_title": "دائرة الزراعة والثروة الحيوانية بالشارقة",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "decision_budget",
    "topic": "الميزانية الزراعية",
    "keywords": [
      "ميزانية مشروع زراعي",
      "تكلفة زراعة"
    ],
    "answer_ar": "الخطة التجارية يجب أن تفرق بين تكلفة تأسيس ثابتة وتكلفة تشغيل ومدخلات متكررة، وأن تترك احتياطياً للماء والطاقة والصيانة والفاقد لا أن تنفق الميزانية كلها على البذور والأسمدة.",
    "kind": "agronomy",
    "authority": "MOCCAE",
    "emirate": "UAE",
    "source_id": "moccae_agri_dev",
    "source_url": "https://moccae.gov.ae/ar/knowledge/agriculture-development-and-health",
    "source_title": "التنمية والصحة الزراعية",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  },
  {
    "id": "decision_safety",
    "topic": "بوابة السلامة",
    "keywords": [
      "مبيد خطر",
      "سماد قوي",
      "جرعة"
    ],
    "answer_ar": "أي توصية تتضمن مبيداً أو جرعة أو مادة مقيدة تمر أولاً ببوابة السلامة: تسجيل المنتج، المحصول/الآفة على الملصق، الجرعة الرسمية، معدات الوقاية، فترة الأمان، وظروف التطبيق.",
    "kind": "agronomy",
    "authority": "UAE Legislation",
    "emirate": "UAE",
    "source_id": "uae_leg_pesticides_2020",
    "source_url": "https://uaelegislation.gov.ae/en/legislations/1463",
    "source_title": "القانون الاتحادي رقم 10 لسنة 2020 بشأن المبيدات",
    "verified_at": "2026-08-17",
    "freshness": "stable",
    "legal_reference": null,
    "warning": null
  }
];

function arr(v){return Array.isArray(v)?v:[];}
function clean(v,max=2000){return String(v||"").replace(/\s+/g," ").trim().slice(0,max);}
function legalQuery(q=""){
  const t=normalizeAr(q);
  return /(قانون|تشريع|ترخيص|تصريح|استيراد|تصدير|ممنوع|محظور|مقيد|تسجيل|رسوم|جمارك|حجر|افراج|شهادة صحه نباتيه|متبقيات|mrl|permit|license|import|export|law|regulation)/i.test(t);
}
function scoreEntry(query,e){
  const q=normalizeAr(query); const toks=tokenize(query).filter(x=>x.length>1);
  const hay=normalizeAr([e.topic,...arr(e.keywords),e.answer_ar,e.emirate,e.legal_reference||""].join(" "));
  let s=0;
  for(const k of arr(e.keywords)){const n=normalizeAr(k); if(n&&q.includes(n)) s+=18;}
  for(const t of toks){if(hay.includes(t)) s+=Math.min(6,2+t.length/3);}
  if(legalQuery(query)&&e.kind==="regulation") s+=10;
  if(q.includes("الامارات")||q.includes("الإمارات")) s+=2;
  if(e.emirate&&e.emirate!=="UAE"&&hay.includes(q)) s+=3;
  return s;
}
export function searchUaeAgriculture(query="",{limit=8,regulationsOnly=false}={}){
  const rows=UAE_AGRI_ENTRIES.filter(e=>!regulationsOnly||e.kind==="regulation")
    .map(e=>({...e,score:scoreEntry(query,e)})).filter(e=>e.score>=5)
    .sort((a,b)=>b.score-a.score||String(a.id).localeCompare(String(b.id))).slice(0,Math.max(1,Math.min(12,Number(limit)||8)));
  return rows;
}
export function answerUaeAgricultureKnowledge(message="",locale="ar"){
  if(locale==="en") return null;
  const regulatory=legalQuery(message);
  const normalized=normalizeAr(message);
  // Do not hijack commercial/project discovery turns such as "عندي مزرعة وعايز بيت محمي".
  // Those must continue through the sales/project planner; this layer answers explicit knowledge/regulatory questions.
  if(!regulatory && /(عايز|اريد|أريد|ابغى|احتاج|اشتري|شراء|ميزاني|مشروع|عندي مزرعه|عندي مزرعة|ابني|بناء بيت محمي|جهزلي|جهز لي)/.test(normalized)
      && !/(كيف|ليه|لماذا|مشكله|مشكلة|مرض|افه|آفة|ملوحه|ملوحة|ري|تسميد|حراره|حرارة|اعراض|أعراض)/.test(normalized)) return null;
  const rows=searchUaeAgriculture(message,{limit:regulatory?4:3,regulationsOnly:regulatory});
  if(!rows.length||rows[0].score<10) return null;
  const top=rows.slice(0,regulatory?3:2);
  const lines=top.map(x=>x.answer_ar);
  const authorities=[...new Set(top.map(x=>x.authority).filter(Boolean))];
  const notice=regulatory?`\n\nمهم: دي معلومة تنظيمية عامة وآخر تحقق للمصدر ${VERIFIED_AT}. قبل إجراء استيراد/ترخيص/تداول فعلي راجع الجهة الرسمية لأن الرسوم والاشتراطات والقرارات التنفيذية ممكن تتحدث.`:"";
  return {
    reply:lines.join("\n\n")+notice,
    entries:top.map(x=>({id:x.id,topic:x.topic,authority:x.authority,source_url:x.source_url,verified_at:x.verified_at,legal_reference:x.legal_reference||undefined,warning:x.warning||undefined})),
    regulatory,verified_at:VERIFIED_AT,source:"uae_agriculture_intelligence_v14",authorities
  };
}
export function uaeAgricultureHealth(){
  const regulatory=UAE_AGRI_ENTRIES.filter(x=>x.kind==="regulation").length;
  const authorities=UAE_AGRI_ENTRIES.filter(x=>x.kind==="authority").length;
  const agronomy=UAE_AGRI_ENTRIES.length-regulatory-authorities;
  return {version:VERSION,mode:"uae_agricultural_intelligence",verified_at:VERIFIED_AT,entries:UAE_AGRI_ENTRIES.length,regulatory_entries:regulatory,authority_entries:authorities,agronomy_entries:agronomy,legal_freshness_guard:true,official_source_manifest:true,country:"United Arab Emirates"};
}
