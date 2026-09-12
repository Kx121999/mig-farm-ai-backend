import { bearerChallenge, verifyAccessToken } from "./noon-mcp-auth.js";

const SERVER_INFO = { name: "mig-farm-noon", version: "1.0.0" };

const FILE_SCHEMA = {
  type: "object",
  properties: {
    download_url: { type: "string", format: "uri" },
    file_id: { type: "string" },
    mime_type: { type: "string" },
    file_name: { type: "string" },
  },
  required: ["download_url", "file_id"],
  additionalProperties: true,
};

const TOOLS = [
  {
    name: "search_noon_categories",
    title: "Search Noon categories",
    description: "Use this when the user needs the correct Noon category code before preparing or submitting a product.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "English category search text, such as seeds or gardening." },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      additionalProperties: false,
    },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
  {
    name: "get_noon_category_attributes",
    title: "Get Noon category attributes",
    description: "Use this after resolving a category code to learn its current required and optional product attributes before submission.",
    inputSchema: {
      type: "object",
      properties: { category_code: { type: "string" } },
      required: ["category_code"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
  {
    name: "get_noon_product_status",
    title: "Get Noon product status",
    description: "Use this to check completeness, image review, QC status, rejection reasons, and live status for a previously submitted Noon product.",
    inputSchema: {
      type: "object",
      properties: { sku_parent: { type: "string" } },
      required: ["sku_parent"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
  {
    name: "get_noon_price",
    title: "Get Noon price",
    description: "Use this to read the current UAE price and activation state for a MIG FARM partner SKU on Noon.",
    inputSchema: {
      type: "object",
      properties: {
        partner_sku: { type: "string" },
        country_code: { type: "string", enum: ["ae"], default: "ae" },
      },
      required: ["partner_sku"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
  {
    name: "submit_noon_product",
    title: "Submit product to Noon",
    description: "Use this only after the user confirms the exact product data, partner SKU, price, stock, and images. Creates or updates the product content, pricing, and stock, then returns Noon QC and live status.",
    inputSchema: {
      type: "object",
      properties: {
        partner_sku: { type: "string", minLength: 1 },
        brand: { type: "string", minLength: 1 },
        category: { type: "string", minLength: 1 },
        title_ar: { type: "string" },
        title_en: { type: "string" },
        description_ar: { type: "string" },
        description_en: { type: "string" },
        features_ar: { type: "array", items: { type: "string" }, maxItems: 12 },
        features_en: { type: "array", items: { type: "string" }, maxItems: 12 },
        image_urls: { type: "array", items: { type: "string", format: "uri" }, maxItems: 12 },
        image_files: { type: "array", items: FILE_SCHEMA, maxItems: 12 },
        attributes: { type: "object", additionalProperties: true },
        price: { type: "number", minimum: 0 },
        msrp: { type: "number", minimum: 0 },
        qty: { type: "integer", minimum: 0 },
        warehouse_code: { type: "string" },
        activate: { type: "boolean", default: false },
        confirmed: { type: "boolean", const: true, description: "True only after the user has approved this exact submission." },
      },
      required: ["partner_sku", "brand", "category", "title_ar", "title_en", "description_ar", "description_en", "price", "qty", "confirmed"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    _meta: { "openai/fileParams": ["image_files"] },
  },
  {
    name: "update_noon_offer",
    title: "Update Noon price or stock",
    description: "Use this after user confirmation to update the UAE price, activation state, or available stock for an existing partner SKU.",
    inputSchema: {
      type: "object",
      properties: {
        partner_sku: { type: "string", minLength: 1 },
        price: { type: "number", minimum: 0 },
        msrp: { type: "number", minimum: 0 },
        is_active: { type: "boolean" },
        qty: { type: "integer", minimum: 0 },
        warehouse_code: { type: "string" },
        confirmed: { type: "boolean", const: true },
      },
      required: ["partner_sku", "confirmed"],
      anyOf: [{ required: ["price"] }, { required: ["qty"] }, { required: ["is_active"] }],
      additionalProperties: false,
    },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
];

function normalizeCategories(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.items)) {
    return data.items
      .map((item) => typeof item === "string" ? item : item?.category_code || item?.code || item?.name)
      .filter(Boolean);
  }
  return [];
}

function textResult(message, data) {
  return {
    content: [{ type: "text", text: message }],
    structuredContent: data,
  };
}

async function callTool(name, args, claims, executeNoonAction) {
  switch (name) {
    case "search_noon_categories": {
      const raw = await executeNoonAction("list_categories", {});
      const query = String(args.query || "").trim().toLowerCase();
      const limit = Math.min(50, Math.max(1, Number(args.limit || 20)));
      const all = normalizeCategories(raw);
      const categories = all.filter((value) => !query || String(value).toLowerCase().includes(query)).slice(0, limit);
      return textResult(`Found ${categories.length} matching Noon categories.`, { query, total_categories: all.length, categories });
    }
    case "get_noon_category_attributes": {
      const result = await executeNoonAction("category_attributes", { category_code: args.category_code });
      return textResult(`Loaded current Noon attributes for ${args.category_code}.`, { category_code: args.category_code, result });
    }
    case "get_noon_product_status": {
      const result = await executeNoonAction("get_content", { sku_parent: args.sku_parent });
      return textResult(result?.summary?.live ? "The product is live on Noon." : "The product is not confirmed live. Review the returned completeness and QC details.", result);
    }
    case "get_noon_price": {
      const result = await executeNoonAction("get_price", { partner_sku: args.partner_sku, country_code: args.country_code || "ae" });
      return textResult(`Loaded Noon pricing for ${args.partner_sku}.`, { partner_sku: args.partner_sku, result });
    }
    case "submit_noon_product": {
      if (!String(claims.scope || "").split(/\s+/).includes("noon:write")) throw new Error("insufficient_scope:noon:write");
      if (args.confirmed !== true) throw new Error("user_confirmation_required");
      const imageUrls = [...(args.image_urls || []), ...(args.image_files || []).map((file) => file.download_url)].filter(Boolean);
      const product = {
        partner_sku: args.partner_sku,
        brand: args.brand,
        category: args.category,
        title_ar: args.title_ar,
        title_en: args.title_en,
        description_ar: args.description_ar,
        description_en: args.description_en,
        features_ar: args.features_ar,
        features_en: args.features_en,
        images: imageUrls,
        attributes: args.attributes || {},
      };
      const result = await executeNoonAction("create_and_publish", {
        product,
        country_code: "ae",
        price: args.price,
        msrp: args.msrp,
        qty: args.qty,
        warehouse_code: args.warehouse_code,
        activate: Boolean(args.activate),
      });
      return textResult(result?.summary?.live ? "Product submitted and confirmed live on Noon." : "Product submitted to Noon. It is not confirmed live yet; review QC and completeness.", result);
    }
    case "update_noon_offer": {
      if (!String(claims.scope || "").split(/\s+/).includes("noon:write")) throw new Error("insufficient_scope:noon:write");
      if (args.confirmed !== true) throw new Error("user_confirmation_required");
      const result = {};
      if (args.price !== undefined || args.is_active !== undefined || args.msrp !== undefined) {
        result.pricing = await executeNoonAction("set_price", {
          partner_sku: args.partner_sku,
          country_code: "ae",
          price: args.price,
          msrp: args.msrp,
          is_active: args.is_active,
        });
      }
      if (args.qty !== undefined) {
        result.stock = await executeNoonAction("set_stock", {
          partner_sku: args.partner_sku,
          warehouse_code: args.warehouse_code,
          qty: args.qty,
        });
      }
      return textResult(`Updated Noon offer for ${args.partner_sku}.`, result);
    }
    default:
      throw new Error(`unknown_tool:${name}`);
  }
}

function jsonRpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

async function handleMessage(message, claims, executeNoonAction) {
  if (!message || message.jsonrpc !== "2.0" || !message.method) {
    return jsonRpcError(message?.id, -32600, "Invalid Request");
  }
  const id = message.id;
  const isNotification = id === undefined || id === null;
  if (message.method === "notifications/initialized" || message.method === "notifications/cancelled") return null;
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: message.params?.protocolVersion || "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: "Resolve the Noon category and read its current attributes before submitting. Never invent SKU, brand, price, stock, country of origin, barcode, dimensions, or seed specifications. Ask for missing facts. Call submit_noon_product only after the user confirms the exact payload.",
      },
    };
  }
  if (message.method === "ping") return { jsonrpc: "2.0", id, result: {} };
  if (message.method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  if (message.method === "tools/call") {
    if (isNotification) return null;
    try {
      const result = await callTool(message.params?.name, message.params?.arguments || {}, claims, executeNoonAction);
      return { jsonrpc: "2.0", id, result };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: String(error?.message || "tool_call_failed") }],
        },
      };
    }
  }
  return isNotification ? null : jsonRpcError(id, -32601, "Method not found");
}

function mcpHeaders(request) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "MCP-Protocol-Version": request.headers.get("mcp-protocol-version") || "2025-06-18",
  };
}

function unauthorized(request) {
  return Response.json(
    { error: "unauthorized", message: "Connect MIG FARM Noon through OAuth before using its tools." },
    { status: 401, headers: { "WWW-Authenticate": bearerChallenge(request), "Cache-Control": "no-store" } },
  );
}

export async function handleMcpPOST(request, executeNoonAction) {
  let claims;
  try {
    claims = verifyAccessToken(request, "noon:read");
  } catch {
    return unauthorized(request);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(jsonRpcError(null, -32700, "Parse error")), { status: 400, headers: mcpHeaders(request) });
  }
  const messages = Array.isArray(body) ? body : [body];
  const responses = (await Promise.all(messages.map((message) => handleMessage(message, claims, executeNoonAction)))).filter(Boolean);
  if (!responses.length) return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
  return new Response(JSON.stringify(Array.isArray(body) ? responses : responses[0]), { status: 200, headers: mcpHeaders(request) });
}

export async function handleMcpGET(request) {
  try {
    verifyAccessToken(request, "noon:read");
  } catch {
    return unauthorized(request);
  }
  return new Response("This stateless MCP server accepts JSON-RPC requests over POST.", {
    status: 405,
    headers: { Allow: "POST, OPTIONS", "Cache-Control": "no-store" },
  });
}

export async function handleMcpOPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
      "Access-Control-Allow-Origin": "https://chatgpt.com",
      "Access-Control-Max-Age": "86400",
    },
  });
}
