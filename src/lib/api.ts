const BASE = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function isUnauthorized(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 401;
}

function hasAuthHeader(headers?: HeadersInit): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has("authorization");
  if (Array.isArray(headers)) {
    return headers.some(([name]) => name.toLowerCase() === "authorization");
  }
  return Object.keys(headers).some((name) =>
    name.toLowerCase() === "authorization",
  );
}

async function handleUnauthorized() {
  if (typeof window === "undefined") {
    const { redirect } = await import("next/navigation");
    redirect("/api/auth/expired");
  } else {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/login" });
  }
}

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new ApiError(
      res.status,
      body.detail || body.message || `Request failed`,
    );
    if (error.status === 401 && hasAuthHeader(init?.headers)) {
      await handleUnauthorized();
    }
    throw error;
  }
  if (res.status === 204) return undefined;
  return res.json();
}

export function apiFetch(path: string, token?: string, init?: RequestInit) {
  return request(path, {
    ...init,
    headers: token ? { Authorization: `Bearer ${token}`, ...init?.headers } : init?.headers,
  });
}

export interface BlobResult {
  blob: Blob;
  contentDisposition: string | null;
}

/** Like apiFetch, but for non-JSON downloads (e.g. CSV). Returns the blob
 *  plus the raw Content-Disposition header so callers can derive a filename. */
export async function apiFetchBlob(
  path: string,
  token?: string,
  init?: RequestInit,
): Promise<BlobResult> {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new ApiError(
      res.status,
      body.detail || body.message || `Request failed`,
    );
    if (error.status === 401 && hasAuthHeader(headers)) {
      await handleUnauthorized();
    }
    throw error;
  }
  return {
    blob: await res.blob(),
    contentDisposition: res.headers.get("content-disposition"),
  };
}

export function publicFetch(path: string, init?: RequestInit) {
  return request(path, init);
}
