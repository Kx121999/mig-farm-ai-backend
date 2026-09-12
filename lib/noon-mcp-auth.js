import crypto from "crypto";

const SUPPORTED_SCOPES = ["noon:read", "noon:write"];
const ACCESS_TTL_SECONDS = 8 * 60 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const CODE_TTL_SECONDS = 5 * 60;

function secret() {
  const value = String(
    process.env.NOON_MCP_OAUTH_SECRET ||
      process.env.NOON_ACTION_TOKEN ||
      process.env.MIG_ADMIN_TOKEN ||
      "",
  ).trim();
  if (!value) throw new Error("missing_env:NOON_MCP_OAUTH_SECRET_or_NOON_ACTION_TOKEN");
  return value;
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function parseBase64urlJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function hmac(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function safeEqual(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ""));
  const right = Buffer.from(String(rightValue || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function sign(kind, claims, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlJson({
    ...claims,
    iat: now,
    exp: now + ttlSeconds,
    jti: crypto.randomUUID(),
  });
  const input = `mig.${kind}.${payload}`;
  return `${input}.${hmac(input)}`;
}

function verifySigned(value, expectedKind) {
  const parts = String(value || "").split(".");
  if (parts.length !== 4 || parts[0] !== "mig" || parts[1] !== expectedKind) {
    throw new Error("invalid_token");
  }
  const input = parts.slice(0, 3).join(".");
  if (!safeEqual(parts[3], hmac(input))) throw new Error("invalid_token_signature");
  const claims = parseBase64urlJson(parts[2]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(claims.exp) || claims.exp <= now) throw new Error("token_expired");
  return claims;
}

export function originFromRequest(request) {
  const configured = String(process.env.NOON_MCP_ORIGIN || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;
}

export function resourceFromRequest(request) {
  return `${originFromRequest(request)}/mcp`;
}

export function normalizeScope(value) {
  const requested = String(value || "")
    .split(/\s+/)
    .filter(Boolean);
  const chosen = requested.length
    ? requested.filter((scope) => SUPPORTED_SCOPES.includes(scope))
    : [...SUPPORTED_SCOPES];
  if (!chosen.length) throw new Error("invalid_scope");
  return [...new Set(chosen)].join(" ");
}

export function supportedScopes() {
  return [...SUPPORTED_SCOPES];
}

export function validateClient(clientId, redirectUri) {
  const id = String(clientId || "");
  const redirect = String(redirectUri || "");
  const validClient =
    /^https:\/\/chatgpt\.com\/oauth\/(?:client|[^/]+\/client)\.json$/.test(id) ||
    /^https:\/\/platform\.openai\.com\/oauth\/(?:client|[^/]+\/client)\.json$/.test(id);
  const validRedirect =
    redirect === "https://chatgpt.com/connector_platform_oauth_redirect" ||
    /^https:\/\/chatgpt\.com\/connector\/oauth\/[^/?#]+$/.test(redirect);
  if (!validClient) throw new Error("invalid_client");
  if (!validRedirect) throw new Error("invalid_redirect_uri");
}

export function validateAuthorizationRequest(params, request) {
  if (params.response_type !== "code") throw new Error("unsupported_response_type");
  validateClient(params.client_id, params.redirect_uri);
  if (params.code_challenge_method !== "S256" || !params.code_challenge) {
    throw new Error("invalid_code_challenge");
  }
  const expectedResource = resourceFromRequest(request);
  if (params.resource && params.resource !== expectedResource) throw new Error("invalid_resource");
  return {
    response_type: "code",
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    state: params.state || "",
    code_challenge: params.code_challenge,
    code_challenge_method: "S256",
    scope: normalizeScope(params.scope),
    resource: expectedResource,
  };
}

export function createAuthorizationCode(claims) {
  return sign("code", claims, CODE_TTL_SECONDS);
}

export function exchangeAuthorizationCode(params, request) {
  const claims = verifySigned(params.code, "code");
  validateClient(params.client_id, params.redirect_uri);
  if (params.client_id !== claims.client_id || params.redirect_uri !== claims.redirect_uri) {
    throw new Error("invalid_grant");
  }
  const resource = params.resource || resourceFromRequest(request);
  if (resource !== claims.resource) throw new Error("invalid_resource");
  const verifier = String(params.code_verifier || "");
  if (verifier.length < 43 || verifier.length > 128) throw new Error("invalid_code_verifier");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  if (!safeEqual(challenge, claims.code_challenge)) throw new Error("invalid_grant");
  return issueTokens({
    client_id: claims.client_id,
    scope: claims.scope,
    resource: claims.resource,
    sub: "mig-farm-owner",
  });
}

function issueTokens(claims) {
  return {
    access_token: sign("access", claims, ACCESS_TTL_SECONDS),
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: sign("refresh", claims, REFRESH_TTL_SECONDS),
    scope: claims.scope,
  };
}

export function exchangeRefreshToken(params, request) {
  const claims = verifySigned(params.refresh_token, "refresh");
  const resource = params.resource || resourceFromRequest(request);
  if (resource !== claims.resource) throw new Error("invalid_resource");
  if (params.client_id && params.client_id !== claims.client_id) throw new Error("invalid_client");
  const requestedScope = params.scope ? normalizeScope(params.scope) : claims.scope;
  const granted = new Set(String(claims.scope || "").split(/\s+/));
  if (requestedScope.split(/\s+/).some((scope) => !granted.has(scope))) {
    throw new Error("invalid_scope");
  }
  return issueTokens({
    client_id: claims.client_id,
    scope: requestedScope,
    resource: claims.resource,
    sub: claims.sub,
  });
}

export function verifyAccessToken(request, requiredScope = "noon:read") {
  const header = String(request.headers.get("authorization") || "");
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new Error("missing_access_token");
  const claims = verifySigned(token, "access");
  if (claims.resource !== resourceFromRequest(request)) throw new Error("invalid_resource");
  const scopes = new Set(String(claims.scope || "").split(/\s+/));
  const allowed = scopes.has(requiredScope) ||
    (requiredScope === "noon:read" && scopes.has("noon:write"));
  if (!allowed) throw new Error("insufficient_scope");
  return claims;
}

export function bearerChallenge(request, scope = "noon:read") {
  const origin = originFromRequest(request);
  return `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="${scope}"`;
}

export function ownerTokenMatches(candidate) {
  const expected = String(
    process.env.NOON_ACTION_TOKEN || process.env.MIG_ADMIN_TOKEN || "",
  ).trim();
  return Boolean(expected) && safeEqual(candidate, expected);
}
