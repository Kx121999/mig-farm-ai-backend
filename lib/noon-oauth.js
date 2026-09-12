import {
  bearerChallenge,
  createAuthorizationCode,
  exchangeAuthorizationCode,
  exchangeRefreshToken,
  originFromRequest,
  ownerTokenMatches,
  resourceFromRequest,
  supportedScopes,
  validateClient,
  validateAuthorizationRequest,
} from "./noon-mcp-auth.js";

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function htmlEscape(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function errorRedirect(params, error, request) {
  try {
    validateClient(params.client_id, params.redirect_uri);
    const target = new URL(params.redirect_uri);
    target.searchParams.set("error", error);
    if (params.state) target.searchParams.set("state", params.state);
    target.searchParams.set("iss", originFromRequest(request));
    return Response.redirect(target.toString(), 302);
  } catch {
    return json({ error }, 400);
  }
}

function authorizationPage(values) {
  const hidden = Object.entries(values)
    .map(([key, value]) =>
      `<input type="hidden" name="${htmlEscape(key)}" value="${htmlEscape(value)}">`,
    )
    .join("");
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ربط MIG FARM مع ChatGPT</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f7f4;color:#17301d;font-family:Arial,sans-serif}.wrap{min-height:100vh;display:grid;place-items:center;padding:24px}.box{width:min(470px,100%);background:#fff;border:1px solid #dfe8df;border-radius:20px;padding:28px;box-shadow:0 18px 50px #17301d14}h1{margin:0 0 8px;color:#174b2a;font-size:25px}.sub{color:#66756a;line-height:1.7;margin-bottom:22px}label{display:block;font-weight:800;margin-bottom:8px}input[type=password]{width:100%;padding:13px 14px;border:1px solid #ccd8ce;border-radius:12px;font-size:16px}button{width:100%;margin-top:14px;padding:13px;border:0;border-radius:12px;background:#174b2a;color:#fff;font-weight:800;font-size:16px;cursor:pointer}.permissions{background:#f2f7f3;border-radius:12px;padding:12px 14px;margin:14px 0;color:#385542;line-height:1.7;font-size:14px}small{display:block;color:#7a887d;margin-top:13px;line-height:1.5}</style></head>
<body><div class="wrap"><div class="box"><h1>MIG FARM × ChatGPT</h1><div class="sub">أدخل رمز إدارة MIG FARM مرة واحدة للسماح لهذا الشات بإدارة منتجات Noon.</div><div class="permissions">الصلاحيات: قراءة التصنيفات وحالة المنتجات، وإرسال أو تحديث المنتجات بعد تأكيدك.</div><form method="post" action="/oauth/authorize">${hidden}<label>رمز دخول MIG FARM</label><input type="password" name="owner_token" required autocomplete="current-password"><button type="submit">موافقة وربط</button></form><small>لا يتم إرسال رمز نون إلى ChatGPT. يستخدم فقط هنا للتحقق من هويتك.</small></div></div></body></html>`;
}

async function paramsFromRequest(request) {
  const contentType = String(request.headers.get("content-type") || "");
  if (contentType.includes("application/json")) return request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

function routeName(request) {
  const url = new URL(request.url);
  return url.searchParams.get("route") || "";
}

export async function handleOAuthGET(request, route = "") {
  const origin = originFromRequest(request);
  if (route === "protected") {
    return json({
      resource: resourceFromRequest(request),
      authorization_servers: [origin],
      scopes_supported: supportedScopes(),
      resource_documentation: `${origin}/api/noon-product`,
    });
  }
  if (route === "metadata") {
    return json({
      issuer: origin,
      authorization_response_iss_parameter_supported: true,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      client_id_metadata_document_supported: true,
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      scopes_supported: supportedScopes(),
    });
  }
  if (route === "authorize") {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    delete params.route;
    try {
      const normalized = validateAuthorizationRequest(params, request);
      return new Response(authorizationPage(normalized), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
          "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
        },
      });
    } catch (error) {
      return errorRedirect(params, String(error.message || "invalid_request"), request);
    }
  }
  return json({ error: "not_found" }, 404);
}

export async function handleOAuthPOST(request, route = "") {
  let params;
  try {
    params = await paramsFromRequest(request);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  if (route === "authorize") {
    try {
      const normalized = validateAuthorizationRequest(params, request);
      if (!ownerTokenMatches(params.owner_token)) {
        return errorRedirect(params, "access_denied", request);
      }
      const code = createAuthorizationCode(normalized);
      const target = new URL(normalized.redirect_uri);
      target.searchParams.set("code", code);
      if (normalized.state) target.searchParams.set("state", normalized.state);
      target.searchParams.set("iss", originFromRequest(request));
      return Response.redirect(target.toString(), 302);
    } catch (error) {
      return errorRedirect(params, String(error.message || "invalid_request"), request);
    }
  }
  if (route === "token") {
    try {
      let result;
      if (params.grant_type === "authorization_code") {
        result = exchangeAuthorizationCode(params, request);
      } else if (params.grant_type === "refresh_token") {
        result = exchangeRefreshToken(params, request);
      } else {
        return json({ error: "unsupported_grant_type" }, 400);
      }
      return json(result);
    } catch (error) {
      return json({ error: "invalid_grant", error_description: String(error.message || "invalid_grant") }, 400);
    }
  }
  return json({ error: "not_found" }, 404, {
    "WWW-Authenticate": bearerChallenge(request),
  });
}
