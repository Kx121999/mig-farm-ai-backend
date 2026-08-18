import { normalizeAr } from "./utils.js";
import { createCrmLead, createQuotationDraft, trackVerifiedOrder, odooActionGatewayHealth } from "./odoo_action_gateway.js";

const VERSION="25.0";
const ACTION_TTL_TURNS=6;
const QUOTE_RX=/(عرض سعر|كوتيشن|كوتيشن|quotation|quote|سعر جمله|سعر جملة|جهز(?:لي| لي)? (?:عرض|الطلب|السله|السلة)|حضّر(?:لي| لي)? الطلب|prepare (?:a )?quote)/;
const PURCHASE_RX=/(عايز اطلب|عاوز اطلب|ابغي اطلب|ابي اطلب|اريد اطلب|اطلبه|اطلبهم|خلاص هاخد|خلاص باخذ|جهزلي|اضف للسله|ضيف للسله|place order|order these|add to cart)/;
const LEAD_RX=/(كلموني|اتصلوا بي|اتصل بي|خلي حد يكلمني|خلي المندوب يكلمني|مندوب يتواصل|سجل بياناتي|تواصلوا معي|call me|contact me|sales rep)/;
const CANCEL_RX=/^(لا|الغاء|إلغاء|الغي|ألغي|مش عايز|ما ابغي|cancel|stop)(?:\s+(?:الطلب|العرض|التنفيذ|الاجراء|الإجراء|ده|هذا))?[\s.!؟?]*$/;

function clean(value="",max=500){return String(value??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function n(value=""){return normalizeAr(clean(value,3000));}
function arr(value){return Array.isArray(value)?value:[];}
function digits(value=""){return String(value||"").replace(/\D/g,"").slice(-15);}
function product(value){
  if(!value||typeof value!=="object")return null;
  const out={name:clean(value.name||value.title,300),sku:clean(value.sku||value.default_code,160),product_id:Math.max(0,Number(value.product_id)||0)||null,product_template_id:Math.max(0,Number(value.product_template_id)||0)||null,quantity:Math.max(1,Math.min(999,Number(value.quantity)||1)),price:clean(value.price,80),currency:clean(value.currency||"AED",20),availability:clean(value.availability,100)};
  return out.name||out.sku||out.product_id?out:null;
}
function productKey(value={}){const p=product(value);return p?String(p.product_id||p.sku||n(p.name)):"";}
function safeId(){try{return crypto.randomUUID();}catch{return `act-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;}}

export function normalizeAutonomousActionRequest(value){
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const customer=value.customer&&typeof value.customer==="object"&&!Array.isArray(value.customer)?value.customer:{};
  return {action_id:clean(value.action_id,120),confirm:Boolean(value.confirm),cancel:Boolean(value.cancel),customer:{name:clean(customer.name,180),phone:digits(customer.phone),email:clean(customer.email,240).toLowerCase(),order_ref:clean(customer.order_ref||value.order_ref,120)},lines:arr(value.lines).slice(0,8).map(line=>({key:clean(line?.key,220),quantity:Math.max(1,Math.min(999,Number(line?.quantity)||1))})),consent:Boolean(value.consent)};
}

export function sanitizeAutonomousActionState(value){
  if(!value||typeof value!=="object"||Array.isArray(value)||value.active===false)return null;
  const lines=arr(value.lines).slice(0,8).map(product).filter(Boolean);
  const kind=["quotation","crm_lead","order_status"].includes(String(value.kind||""))?String(value.kind):"";if(!kind)return null;
  return {active:true,version:VERSION,id:clean(value.id,120),kind,status:["awaiting_confirmation","executed","cancelled","failed"].includes(value.status)?value.status:"awaiting_confirmation",created_turn:Math.max(0,Number(value.created_turn)||0),expires_turn:Math.max(0,Number(value.expires_turn)||0),attempts:Math.max(0,Math.min(5,Number(value.attempts)||0)),summary:clean(value.summary,700),lines,required_fields:arr(value.required_fields).slice(0,6).map(x=>clean(x,40)).filter(Boolean),result:value.result&&typeof value.result==="object"?{kind:clean(value.result.kind,40),reference:clean(value.result.reference,120),state:clean(value.result.state,40),status_ar:clean(value.result.status_ar,100),amount_total:Number(value.result.amount_total)||0,currency:clean(value.result.currency,20),at:clean(value.result.at,40)}:null};
}

function actionKind(message="",semanticFrame={}){
  const text=n(message),intents=arr(semanticFrame?.intents).map(x=>String(x?.name||x));
  if(LEAD_RX.test(text))return "crm_lead";
  if(intents.includes("order_status")||/(تتبع|حاله|حالة|وين).{0,12}(طلبي|الطلب)|track order|order status/.test(text))return "order_status";
  if(QUOTE_RX.test(text)||PURCHASE_RX.test(text))return "quotation";
  return "";
}

function selectedLines({selectedProduct=null,selectedProducts=[],state={},semanticFrame={}}={}){
  let candidates=arr(selectedProducts).map(product).filter(Boolean);
  if(!candidates.length&&selectedProduct)candidates=[product(selectedProduct)].filter(Boolean);
  if(!candidates.length&&state?.active_product_context?.product)candidates=[product(state.active_product_context.product)].filter(Boolean);
  if(!candidates.length){
    const visible=arr(state?.visible_products).map(product).filter(Boolean);
    const plural=/(دول|هذول|كلهم|المنتجات|these|all)/.test(n(semanticFrame?.normalized?.raw||""));
    if(visible.length===1||plural)candidates=visible.slice(0,4);
  }
  const quantity=Number(semanticFrame?.entities?.quantities?.[0]?.value)||null;
  return candidates.slice(0,8).map(item=>({...item,quantity:quantity&&candidates.length===1?Math.max(1,Math.min(999,quantity)):item.quantity||1}));
}

function requirements(kind){
  if(kind==="order_status")return ["order_ref","phone"];
  if(kind==="crm_lead")return ["name","phone"];
  return ["name","phone"];
}
function actionLabel(kind){return kind==="quotation"?"إنشاء مسودة عرض السعر":kind==="crm_lead"?"تسجيل طلب التواصل":"التحقق وعرض حالة الطلب";}
function proposalReply(pending,locale="ar"){
  if(locale==="en")return pending.kind==="quotation"?"I prepared the quotation request below. Review the products and quantities, add your contact details, then confirm. This creates a draft quotation only—not a confirmed order.":pending.kind==="crm_lead"?"Add your contact details below and confirm so I can create a CRM follow-up request.":"Enter the order reference and the same phone used on the order. I will show the status only after they match.";
  if(pending.kind==="quotation")return `جهزت طلب عرض السعر${pending.lines.length?` لـ ${pending.lines.length} منتج` :""}. راجع الكميات واكتب بيانات التواصل ثم اضغط التأكيد. اللي هيتعمل مسودة عرض سعر فقط، مش طلب بيع مؤكد.`;
  if(pending.kind==="crm_lead")return "اكتب اسمك ورقم التواصل في النموذج واضغط التأكيد، وأنا أسجل طلب متابعة داخل CRM.";
  return "اكتب رقم الطلب ونفس رقم الهاتف المستخدم فيه. مش هعرض أي حالة أو قيمة إلا بعد تطابق البيانات.";
}
function publicAction(pending){
  if(!pending)return null;
  return {version:VERSION,action_id:pending.id,kind:pending.kind,status:pending.status,title:actionLabel(pending.kind),summary:pending.summary,required_fields:pending.required_fields,lines:pending.lines.map(line=>({key:productKey(line),name:line.name,sku:line.sku,quantity:line.quantity,price:line.price,currency:line.currency})),requires_confirmation:pending.status==="awaiting_confirmation",consent_text:pending.kind==="order_status"?"أوافق على استخدام البيانات للتحقق من هذا الطلب فقط.":"أوافق على إرسال البيانات إلى Odoo لتنفيذ الإجراء الموضح فقط.",result:pending.result||undefined};
}

function newPending(kind,{turn=0,lines=[]}={}){
  const lineSummary=lines.map(x=>`${x.name||x.sku} × ${x.quantity}`).join("، ");
  return {active:true,version:VERSION,id:safeId(),kind,status:"awaiting_confirmation",created_turn:turn,expires_turn:turn+ACTION_TTL_TURNS,attempts:0,summary:clean(kind==="quotation"?(lineSummary||"مسودة عرض سعر لمنتجات يحددها العميل"):kind==="crm_lead"?"طلب تواصل ومتابعة من فريق MIG FARM":"استعلام خاص عن حالة طلب بعد التحقق",700),lines,required_fields:requirements(kind),result:null};
}

function validateCustomer(kind,request={}){
  const c=request.customer||{};const errors=[];
  if(kind==="order_status"&&!clean(c.order_ref,120))errors.push("order_ref");
  if(kind!=="order_status"&&!clean(c.name,180))errors.push("name");
  if(digits(c.phone).length<7)errors.push("phone");
  if(c.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))errors.push("email");
  if(!request.consent)errors.push("consent");
  return errors;
}
function mergeLineQuantities(pendingLines=[],submitted=[]){
  const submittedMap=new Map(arr(submitted).map(x=>[clean(x.key,220),Math.max(1,Math.min(999,Number(x.quantity)||1))]));
  return pendingLines.map(line=>{const key=productKey(line);return {...line,quantity:submittedMap.has(key)?submittedMap.get(key):line.quantity};});
}
function publicGatewayError(error){
  const code=clean(error?.message||"gateway_unavailable",120);
  return ["odoo_actions_not_configured","odoo_auth_failed","gateway_unavailable"].includes(code)?code:"odoo_gateway_failed";
}

export async function handleAutonomousAction({message="",semanticFrame={},state={},selectedProduct=null,selectedProducts=[],actionRequest=null,locale="ar",gateway=null}={}){
  const turn=Math.max(0,Number(state?.turn)||0)+1;let pending=sanitizeAutonomousActionState(state?.autonomous_action);
  if(pending?.expires_turn&&turn>pending.expires_turn)pending=null;
  const request=normalizeAutonomousActionRequest(actionRequest);
  if((request?.cancel||(pending&&CANCEL_RX.test(n(message))))&&pending){
    const cancelled={...pending,status:"cancelled",active:true,result:null};
    return {handled:true,source:"v25_action_cancelled",state:cancelled,payload:{reply:"تمام، ألغيت الإجراء ومفيش أي بيانات اتبعتت لـOdoo.",autonomous_action:publicAction(cancelled)}};
  }

  if(request?.confirm){
    if(!pending||pending.status!=="awaiting_confirmation"||request.action_id!==pending.id)return {handled:true,source:"v25_action_confirmation_rejected",state:pending,payload:{reply:"طلب التأكيد انتهى أو مش مطابق للجلسة الحالية. اطلب الإجراء من جديد عشان ما ننفذش حاجة بالغلط.",autonomous_action:publicAction(pending)}};
    const errors=validateCustomer(pending.kind,request);
    if(errors.length){const failed={...pending,attempts:pending.attempts+1};return {handled:true,source:"v25_action_validation",state:failed,payload:{reply:"راجع البيانات المطلوبة والموافقة قبل التنفيذ.",validation_errors:errors,autonomous_action:publicAction(failed)}};}
    const api=gateway||{createCrmLead,createQuotationDraft,trackVerifiedOrder};
    try{
      let result;
      const idempotencyKey=`${pending.id}:${pending.kind}`;
      if(pending.kind==="crm_lead")result=await api.createCrmLead({customer:request.customer,summary:pending.summary,description:"Confirmed website chat follow-up request",idempotency_key:idempotencyKey});
      else if(pending.kind==="quotation")result=await api.createQuotationDraft({customer:request.customer,lines:mergeLineQuantities(pending.lines,request.lines),summary:pending.summary,idempotency_key:idempotencyKey});
      else result=await api.trackVerifiedOrder({order_ref:request.customer.order_ref,phone:request.customer.phone});
      if(!result?.ok){const failed={...pending,status:"failed",attempts:pending.attempts+1};const privateFailure=result?.error==="identity_verification_failed"?"بيانات التحقق غير مطابقة، لذلك مش هعرض أي معلومات عن الطلب.":"ما قدرتش أنفذ الإجراء بأمان حاليًا. مفيش طلب اتأكد ومفيش دفع تم.";return {handled:true,source:"v25_action_safe_failure",state:failed,payload:{reply:privateFailure,action_error:clean(result?.error||"action_failed",100),autonomous_action:publicAction(failed)}};}
      const receipt={kind:result.kind,reference:result.reference,state:result.state,status_ar:result.status_ar,amount_total:Number(result.amount_total)||0,currency:result.currency||"AED",at:new Date().toISOString()};
      const executed={...pending,status:"executed",result:receipt};
      let reply=result.message||"تم تنفيذ الإجراء بنجاح.";
      if(pending.kind==="quotation")reply=`تم إنشاء مسودة عرض السعر ${result.reference}${result.amount_total?` بإجمالي ${result.amount_total} ${result.currency||"AED"}`:""}. دي مسودة فقط ولسه مش طلب بيع مؤكد ولا تم أي دفع.`;
      if(pending.kind==="order_status")reply=`تم التحقق. حالة الطلب ${result.reference}: ${result.status_ar||result.state}.${result.commitment_date?` الموعد المسجل: ${result.commitment_date}.`:""}`;
      return {handled:true,source:`v25_action_${pending.kind}_success`,state:executed,payload:{reply,autonomous_action:publicAction(executed),action_receipt:receipt}};
    }catch(error){
      const failed={...pending,status:"failed",attempts:pending.attempts+1};return {handled:true,source:"v25_action_gateway_unavailable",state:failed,payload:{reply:"التنفيذ المباشر على Odoo مش متاح حاليًا، لذلك وقفت قبل إنشاء أي شيء. تقدر تكمل مع الفريق بدون ما نعتبر الطلب اتنفذ.",action_error:publicGatewayError(error),autonomous_action:publicAction(failed),escalation:true}};
    }
  }

  const kind=actionKind(message,semanticFrame);if(!kind)return {handled:false,state:pending};
  const lines=kind==="quotation"?selectedLines({selectedProduct,selectedProducts,state,semanticFrame}):[];
  if(kind==="quotation"&&!lines.length)return {handled:true,source:"v25_action_quote_needs_product",state:pending,payload:{reply:"أقدر أجهز عرض السعر، لكن لازم تختار المنتج من الكارت أو تكتب اسمه والكمية الأول. مش هعمل عرض عام بمنتجات متخمنة.",quick_replies:["اعرض المنتجات","هكتب اسم المنتج"]}};
  const created=newPending(kind,{turn,lines});
  return {handled:true,source:`v25_action_${kind}_proposal`,state:created,payload:{reply:proposalReply(created,locale),autonomous_action:publicAction(created),quick_replies:[{label:"إلغاء الإجراء",message:"إلغاء الإجراء"}]}};
}

export function autonomousActionHealth(){
  return {version:VERSION,mode:"explicit_confirmation_autonomous_sales_actions",action_ttl_turns:ACTION_TTL_TURNS,actions:["draft_quotation","crm_lead","verified_order_status"],gateway:odooActionGatewayHealth(),guarantees:["server_authoritative_pending_action","explicit_consent","no_order_confirmation","no_payment_capture","no_raw_pii_in_conversation_state","idempotent_mutations","bounded_quantities","product_identity_resolution","private_order_verification","safe_failure"]};
}
