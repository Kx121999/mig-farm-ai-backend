import assert from "node:assert/strict";
import { POST as authPost, GET as authGet } from "../api/admin-auth.js";
import { GET as dashboardGet } from "../api/admin-dashboard.js";
import { authenticateAdminV28 } from "../lib/admin_auth_v28.js";

process.env.MIG_ADMIN_TOKEN="test-admin-token-28";process.env.MIG_ADMIN_SESSION_SECRET="test-session-secret-28";
const denied=authenticateAdminV28(new Request("https://example.com/api/admin-dashboard"));assert.equal(denied.ok,false);
const loginReq=new Request("https://example.com/api/admin-auth",{method:"POST",headers:{"content-type":"application/json","sec-fetch-site":"same-origin","host":"example.com","origin":"https://example.com"},body:JSON.stringify({action:"login",token:"test-admin-token-28"})});
const login=await authPost(loginReq);assert.equal(login.status,200);const cookie=login.headers.get("set-cookie");assert.ok(cookie?.includes("HttpOnly"));assert.ok(cookie?.includes("SameSite=Strict"));assert.equal(cookie.includes("test-admin-token-28"),false);
const sessionCookie=cookie.split(";")[0];const session=await authGet(new Request("https://example.com/api/admin-auth",{headers:{cookie:sessionCookie}}));assert.equal(session.status,200);
const dashboard=await dashboardGet(new Request("https://example.com/api/admin-dashboard",{headers:{cookie:sessionCookie}}));assert.equal(dashboard.status,200);const body=await dashboard.json();assert.equal(body.version,"31.0.0");assert.equal(body.security.secrets_returned,false);assert.equal(JSON.stringify(body).includes("test-admin-token-28"),false);
delete process.env.MIG_ADMIN_TOKEN;delete process.env.MIG_ADMIN_SESSION_SECRET;
console.log("V28 admin security PASS");
