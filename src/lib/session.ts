// Shared by proxy.ts and server code, so it only uses Web Crypto.

export const SESSION_COOKIE = "mb_admin";
export const SESSION_DAYS = 7;
export const DEFAULT_PASSWORD = "mrbrands2026";

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

function secret() {
  return process.env.SESSION_SECRET || `mrbrands::${adminPassword()}`;
}

function toBase64Url(bytes: ArrayBuffer) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

export async function createSessionToken(now = Date.now()) {
  const exp = now + SESSION_DAYS * 86400_000;
  return `${exp}.${await sign(`admin.${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!exp || !sig || exp < now) return false;
  const expected = await sign(`admin.${exp}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export async function passwordMatches(input: string) {
  // Compare digests so timing does not depend on where the strings differ.
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(input)),
    crypto.subtle.digest("SHA-256", enc.encode(adminPassword())),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
