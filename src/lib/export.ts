import { apiFetch, apiFetchBlob } from "@/lib/api";
import type { components } from "@/lib/api.types";

type GoogleConnectionStatusResponse =
  components["schemas"]["GoogleConnectionStatusResponse"];
type GoogleConnectResponse = components["schemas"]["GoogleConnectResponse"];
type GoogleSheetsExportResponse =
  components["schemas"]["GoogleSheetsExportResponse"];
type GoogleDisconnectResponse =
  components["schemas"]["GoogleDisconnectResponse"];

/** Scopes must match the backend's SCOPES and the Cloud console.
 *  Canonical URL forms: Google echoes scopes back canonically and oauthlib
 *  rejects any difference ("Scope has changed"), so `email` must be spelled
 *  as userinfo.email. `openid` is already canonical. */
const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
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
): Promise<GoogleConnectionStatusResponse> {
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

// ----- csv export -----

export interface CsvExportResult {
  blob: Blob;
  filename: string;
}

const FALLBACK_CSV_FILENAME = "form-responses.csv";

/** Derive a download filename from a Content-Disposition header.
 *  Handles `attachment; filename="foo.csv"`, `filename=foo.csv`, and
 *  RFC 5987 `filename*=UTF-8''foo.csv`. Falls back to form-responses.csv. */
export function parseCsvFilename(
  contentDisposition: string | null,
): string {
  if (contentDisposition) {
    const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
    if (encoded?.[1]) {
      try {
        const decoded = decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
        if (decoded) return decoded;
      } catch {
        // fall through to the plain filename match
      }
    }
    const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
    const name = plain?.[1]?.trim();
    if (name) return name;
  }
  return FALLBACK_CSV_FILENAME;
}

/** Download a form's responses as a CSV file (Excel and Sheets compatible).
 *  Works with zero responses (backend returns a header-only file). */
export async function exportToCsv(
  token: string,
  formId: string,
): Promise<CsvExportResult> {
  const { blob, contentDisposition } = await apiFetchBlob(
    `/api/v1/export/csv/${formId}`,
    token,
  );
  return { blob, filename: parseCsvFilename(contentDisposition) };
}

/** Trigger a browser download for an in-memory blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
