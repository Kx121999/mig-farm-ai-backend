import crypto from "crypto";

const BASE_URL = "https://noon-api-gateway.noon.partners";
const USER_AGENT = "MIGFARM-Noon-Integration/1.0";

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`missing_env:${name}`);
  return value;
}

function normalizePrivateKey(value) {
  let key = String(value || "").trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function createJwt() {
  const keyId = requiredEnv("NOON_KEY_ID");
  const privateKey = normalizePrivateKey(requiredEnv("NOON_PRIVATE_KEY"));

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: keyId,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(),
    }),
  );

  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    privateKey,
  );

  return `${signingInput}.${base64url(signature)}`;
}

function getCookieHeader(response) {
  const setCookieHeaders =
    response.headers.getSetCookie?.() ||
    [response.headers.get("set-cookie")].filter(Boolean);

  return setCookieHeaders
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function authenticate() {
  const projectCode = requiredEnv("NOON_PROJECT_CODE");

  const response = await fetch(
    `${BASE_URL}/identity/public/v1/api/login`,
    {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: createJwt(),
        default_project_code: projectCode,
      }),
      cache: "no-store",
    },
  );

  if (response.status !== 200) {
    const body = (await response.text()).slice(0, 500);
    console.error("Noon login failed", response.status, body);
    throw new Error(`noon_login_failed:${response.status}`);
  }

  const cookie = getCookieHeader(response);
  if (!cookie) {
    throw new Error("noon_login_failed:no_session_cookie");
  }

  return cookie;
}

export async function GET() {
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };

  try {
    const cookie = await authenticate();

    const response = await fetch(`${BASE_URL}/identity/v1/whoami`, {
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: cookie,
      },
      cache: "no-store",
    });

    if (response.status !== 200) {
      const body = (await response.text()).slice(0, 500);
      console.error("Noon whoami failed", response.status, body);

      return Response.json(
        {
          ok: false,
          step: "whoami",
          status: response.status,
          message:
            "Noon session was created, but identity verification failed.",
        },
        { status: 502, headers },
      );
    }

    return Response.json(
      {
        ok: true,
        service: "MIG FARM Noon Integration",
        authentication: "successful",
        message: "Noon API connection is working.",
        time: new Date().toISOString(),
      },
      { status: 200, headers },
    );
  } catch (error) {
    const detail = String(error?.message || "unknown_error");
    console.error("Noon API test error", detail);

    return Response.json(
      {
        ok: false,
        service: "MIG FARM Noon Integration",
        authentication: "failed",
        error: detail.startsWith("missing_env:")
          ? detail
          : "noon_authentication_failed",
        message:
          "Check the Noon credentials and deployment environment, then try again.",
        time: new Date().toISOString(),
      },
      { status: 500, headers },
    );
  }
}
