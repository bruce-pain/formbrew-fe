"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { exchangeGoogleCode, readOAuthHandshake } from "@/lib/export";

function GoogleExportCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (status === "loading") return; // wait for the session to resolve
    started.current = true;

    // Consume-once: null when opened manually, cleared, or malformed.
    // Without a handshake we don't know the form — generic safe landing.
    const handshake = readOAuthHandshake();
    if (!handshake || !handshake.returnTo.startsWith("/")) {
      router.replace("/dashboard?sheets=error");
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handshake is valid so returnTo is our own stored value — safe to go
    // back to the form with an error. No token exchange happens here.
    if (error || !code || !state || handshake.state !== state) {
      router.replace(`${handshake.returnTo}?sheets=error`);
      return;
    }

    const token =
      status === "authenticated" ? session?.accessToken : undefined;
    if (!token) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(handshake.returnTo)}`,
      );
      return;
    }

    exchangeGoogleCode(token, code, handshake.codeVerifier, handshake.redirectUri)
      .then(() => {
        router.replace(`${handshake.returnTo}?sheets=connected`);
      })
      .catch(() => {
        router.replace(`${handshake.returnTo}?sheets=error`);
      });
  }, [router, searchParams, session, status]);

  return (
    <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
      Connecting your Google account...
    </div>
  );
}

export default function GoogleExportCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
          Connecting your Google account...
        </div>
      }
    >
      <GoogleExportCallbackInner />
    </Suspense>
  );
}
