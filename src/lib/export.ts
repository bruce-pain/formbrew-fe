import { apiFetch } from "@/lib/api";
import type { components } from "@/lib/api.types";

type GoogleStatusResponse = components["schemas"]["GoogleStatusResponse"];
type GoogleConnectResponse = components["schemas"]["GoogleConnectResponse"];
type GoogleSheetsExportResponse =
  components["schemas"]["GoogleSheetsExportResponse"];
type GoogleDisconnectResponse =
  components["schemas"]["GoogleDisconnectResponse"];

/** Scopes must match the backend's SCOPES and the Cloud console. */
const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const STORAGE_KEY = "google_sheets_oauth";
const CALLBACK_PATH = "/export/google/callback";

export interface OAuthHandshake {
  codeVerifier: string;
  state: string;
  /** Form page to return to after the callback finishes. */
  returnTo: string;
  /** Exact redirect URI authorized with Google (Option B: stored, not recomputed). */
  redirectUri: string;
}

/** Single source of truth for the callback URI (used at authorize time). */
export function getRedirectUri(): string {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString(length = 64): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function buildGoogleSheetsAuthUrl(
  returnTo: string,
): Promise<string> {
  if (!window.isSecureContext || !crypto.subtle) {
    throw new Error(
      "Google sign-in requires a secure context (HTTPS or localhost).",
    );
  }

  const codeVerifier = randomString(64);
  const state = randomString(32);
  const challengeBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  const codeChallenge = base64UrlEncode(new Uint8Array(challengeBytes));

  const redirectUri = getRedirectUri();
  const handshake: OAuthHandshake = {
    codeVerifier,
    state,
    returnTo,
    redirectUri,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(handshake));

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Consume-once read of the stored handshake. Returns null when there is
 * nothing stored, storage is unavailable, or the payload is malformed.
 */
export function readOAuthHandshake(): OAuthHandshake | null {
  if (typeof window === "undefined") return null;
  let storedRaw: string | null = null;
  try {
    storedRaw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!storedRaw) return null;
  try {
    const parsed = JSON.parse(storedRaw) as Partial<OAuthHandshake>;
    if (
      typeof parsed.codeVerifier !== "string" ||
      typeof parsed.state !== "string" ||
      typeof parsed.returnTo !== "string" ||
      typeof parsed.redirectUri !== "string"
    ) {
      return null;
    }
    return parsed as OAuthHandshake;
  } catch {
    return null;
  }
}

export async function getExportStatus(
  token: string,
): Promise<GoogleStatusResponse> {
  return apiFetch("/api/v1/export/google/status", token);
}

export async function exchangeGoogleCode(
  token: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<GoogleConnectResponse> {
  return apiFetch("/api/v1/export/google/tokens", token, {
    method: "POST",
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });
}

export async function exportToGoogleSheets(
  token: string,
  formId: string,
): Promise<GoogleSheetsExportResponse> {
  return apiFetch(`/api/v1/export/google/sheets/${formId}`, token, {
    method: "POST",
  });
}

export async function disconnectGoogleExport(token: string): Promise<void> {
  const res: GoogleDisconnectResponse = await apiFetch(
    "/api/v1/export/google/disconnect",
    token,
    { method: "POST" },
  );
  void res;
}
