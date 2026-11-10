
const COOKIE_NAME = "alpsport_admin";
const SESSION_DURATION = 12 * 60 * 60;

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function getKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function createSignature(payload, secret) {
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function createSession(secret) {
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET en az 32 karakter olmalıdır.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify({
      admin: true,
      issuedAt: now,
      expiresAt: now + SESSION_DURATION
    }))
  );

  const signature = await createSignature(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySession(token, secret) {
  try {
    if (!token || !secret || secret.length < 32) return false;

    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(payload)
    );

    if (!valid) return false;

    const data = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload))
    );

    const now = Math.floor(Date.now() / 1000);

    return data.admin === true &&
      Number.isInteger(data.expiresAt) &&
      data.expiresAt > now &&
      data.issuedAt <= now;
  } catch {
    return false;
  }
}

export function getSessionToken(request) {
  const cookies = request.headers.get("Cookie") || "";

  for (const item of cookies.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;

    const name = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();

    if (name === COOKIE_NAME) return value;
  }

  return null;
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function requireAdmin(request, env) {
  const token = getSessionToken(request);
  return await verifySession(token, env.SESSION_SECRET);
}
