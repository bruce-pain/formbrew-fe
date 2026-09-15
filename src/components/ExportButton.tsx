"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Download, FileSpreadsheet, Loader2, Sheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import { downloadBlob, exportToCsv } from "@/lib/export";

// Google Sheets export is paused while Google verifies our OAuth consent
// screen. The OAuth flow helpers in `@/lib/export` and the callback page at
// `/export/google/callback` are intentionally kept so Sheets can be
// re-enabled by wiring this option back up to them.

export function ExportButton({ formId }: { formId: string }) {
  const { data: session, status } = useSession();
  const token = status === "authenticated" ? session?.accessToken : undefined;

  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleCsvExport() {
    if (!token || downloading) return;
    setDownloading(true);
    try {
      const { blob, filename } = await exportToCsv(token, formId);
      downloadBlob(blob, filename);
      toast.success("Responses exported as CSV");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="size-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export responses</DialogTitle>
          <DialogDescription>
            Choose how you&apos;d like to export this form&apos;s responses.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCsvExport}
            disabled={downloading}
            className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-wait disabled:opacity-70"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {downloading ? "Preparing CSV…" : "CSV file"}
              </span>
              <span className="block text-xs text-muted-foreground">
                Download responses — opens in Excel and Google Sheets
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled
            title="Google Sheets export is coming soon"
            className="flex cursor-not-allowed items-center gap-3 rounded-lg border p-3 text-left opacity-60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Sheet className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-medium">
                Google Sheets
                <Badge variant="secondary">Coming soon</Badge>
              </span>
              <span className="block text-xs text-muted-foreground">
                Direct export to Sheets is paused while Google verifies our app
              </span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
