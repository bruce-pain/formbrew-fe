"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ExternalLink, Loader2, Sheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  buildGoogleSheetsAuthUrl,
  disconnectGoogleExport,
  exportToGoogleSheets,
  getExportStatus,
} from "@/lib/export";

type ConnectionState =
  | { connected: false }
  | { connected: true; email: string | null };

export function ExportButton({ formId }: { formId: string }) {
  const { data: session, status } = useSession();
  const token = status === "authenticated" ? session?.accessToken : undefined;

  const [checking, setChecking] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [connState, setConnState] = useState<ConnectionState>({
    connected: false,
  });
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getExportStatus(token)
      .then((res) => {
        if (cancelled) return;
        setConnState(
          res.data.connected
            ? { connected: true, email: res.data.google_email ?? null }
            : { connected: false },
        );
      })
      .catch(() => {
        // Non-fatal: leave the button usable; a later click re-checks.
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleConnect() {
    if (!token) return;
    setChecking(true);
    try {
      const url = await buildGoogleSheetsAuthUrl(window.location.pathname);
      window.location.assign(url); // cross-origin; never router.push
    } catch (err) {
      setChecking(false);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not start Google sign-in. Check your connection.",
      );
    }
  }

  async function handleExport() {
    if (!token || exporting) return;
    setExporting(true);
    try {
      const res = await exportToGoogleSheets(token, formId);
      setLastUrl(res.data.spreadsheet_url);
      toast.success("Responses exported to Google Sheets", {
        action: {
          label: "Open spreadsheet",
          onClick: () => window.open(res.data.spreadsheet_url, "_blank"),
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Google connection missing or expired → back to Connect state.
        setConnState({ connected: false });
        toast.error("Your Google connection has expired. Reconnect to export.");
      } else if (err instanceof ApiError && err.status === 502) {
        // Transient Google-side failure → keep connected state.
        toast.error(
          "Google Sheets is temporarily unavailable. Try again shortly.",
        );
      } else {
        toast.error(err instanceof ApiError ? err.message : "Export failed");
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleDisconnect() {
    if (!token) return;
    try {
      await disconnectGoogleExport(token);
      setConnState({ connected: false });
      toast.success("Google Sheets disconnected");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Disconnect failed");
    }
  }

  if (checking) {
    return (
      <Button variant="outline" disabled>
        Checking Google Sheets…
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={connState.connected ? "default" : "outline"}
        onClick={connState.connected ? handleExport : handleConnect}
        disabled={exporting}
      >
        {exporting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sheet className="size-4" />
        )}
        {exporting ? "Exporting…" : "Export to Sheets"}
      </Button>

      {lastUrl && (
        <Button variant="ghost" asChild>
          <a href={lastUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Open spreadsheet
          </a>
        </Button>
      )}

      {connState.connected && (
        <>
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
          <span className="text-xs text-muted-foreground">
            {connState.email ? `Connected as ${connState.email}` : "Connected"}
          </span>
        </>
      )}
    </>
  );
}
