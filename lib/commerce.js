function numericId(value){
  const n=Number(value);
  return Number.isInteger(n)&&n>0?n:null;
}

export function clientProduct(product={}){
  const templateId=numericId(product.product_template_id);
  const productId=numericId(product.product_id);
  return {
    name:product.name,
    price:product.price,
    currency:product.currency||"AED",
    availability:product.availability,
    sku:product.sku,
    url:product.url,
    image:product.image||"",
    product_template_id:templateId,
    product_id:productId,
    truth:product.truth&&typeof product.truth==="object"?{
      source:String(product.truth.source||"").slice(0,80),
      observed_at:String(product.truth.observed_at||"").slice(0,40),
      ttl_seconds:Math.max(60,Math.min(3600,Number(product.truth.ttl_seconds)||600)),
      current:Boolean(product.truth.current)
    }:undefined,
    commerce:{
      platform:"odoo19",
      can_attempt_cart:Boolean(templateId),
      requires_configurator_check:Boolean(templateId),
      cart_route:"/shop/cart/add",
      configurator_route:"/website_sale/should_show_product_configurator"
    }
  };
}

export function clientProducts(products=[]){ return (products||[]).filter(Boolean).map(clientProduct); }

export function commerceCapabilities(){
  return {
    platform:"odoo19",
    add_to_cart:true,
    safe_variant_guard:true,
    add_route:"/shop/cart/add",
    configurator_check_route:"/website_sale/should_show_product_configurator",
    cart_page:"/shop/cart"
  };
}
