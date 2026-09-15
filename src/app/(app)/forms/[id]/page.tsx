"use client";

import { Fragment, Suspense, use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";

import { ResponseAnswers } from "@/components/ResponseAnswers";
import { ExportButton } from "@/components/ExportButton";
import { ShareButton } from "@/components/ShareButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ApiError } from "@/lib/api";
import { deleteForm, getForm, updateForm } from "@/lib/form";
import { getFormResponses } from "@/lib/response";
import { formatDate } from "@/lib/utils";

import type { components } from "@/lib/api.types";

type FormQuestion = components["schemas"]["FormQuestion"];
type FormResponseData =
  components["schemas"]["app__features__response__schemas__FormResponseData"];
type ResponseAnswer = components["schemas"]["ResponseAnswer"];

type SummarySection =
  | { question: FormQuestion; values: string[] }
  | {
      question: FormQuestion;
      entries: { option: string; count: number }[];
      maxCount: number;
      total: number;
    };

const PREVIEW_LIMIT = 9;

function SummarySection({
  section,
  index,
}: {
  section: SummarySection;
  index: number;
}) {
  const { question } = section;

  if ("values" in section) {
    const { values } = section;
    return (
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-medium">
            <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
            {question.text}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {values.length} {values.length === 1 ? "answer" : "answers"}
          </span>
        </div>
        {values.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No answers yet</p>
        ) : values.length > PREVIEW_LIMIT ? (
          <ol
            tabIndex={0}
            className="scrollbar-hover mt-3 max-h-[calc(36px*9+6px*8)] space-y-1.5 overflow-y-auto pr-2"
          >
            {values.map((value, i) => (
              <li key={i} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                {value}
              </li>
            ))}
          </ol>
        ) : (
          <ol className="mt-3 space-y-1.5">
            {values.map((value, i) => (
              <li key={i} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                {value}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  const { entries, maxCount, total } = section;
  const unit = question.answer_select_multiple === true ? "selection" : "response";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">
          <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
          {question.text}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {total} {total === 1 ? unit : `${unit}s`}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No answers yet</p>
      ) : (
        <div className="mt-3 space-y-3">
          {entries.map(({ option, count }) => {
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={option}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate" title={option}>
                    {option}
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {count} {count === 1 ? unit : `${unit}s`} ({percent}%)
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  {maxCount > 0 && (
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max((count / maxCount) * 100, 4)}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SheetsOutcomeToast({ formId }: { formId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const outcome = searchParams.get("sheets");
    if (outcome === "connected") {
      toast.success("Google Sheets connected");
    } else if (outcome === "error") {
      toast.error("Could not connect Google Sheets");
    }
    if (outcome) {
      router.replace(`/forms/${formId}`, { scroll: false });
    }
  }, [searchParams, router, formId]);

  return null;
}

export default function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = status === "authenticated" ? session?.accessToken : undefined;

  const [form, setForm] = useState<{
    title: string;
    description: string;
    questions: FormQuestion[];
  } | null>(null);
  const [responses, setResponses] = useState<FormResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [responseIndex, setResponseIndex] = useState(0);
  const [unpublishing, setUnpublishing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([getForm(token, id), getFormResponses(token, id)])
      .then(([formRes, responsesRes]) => {
        if (cancelled) return;
        if (!formRes.data.is_published) {
          router.replace(`/forms/${id}/edit`);
          return;
        }
        setForm({
          title: formRes.data.title,
          description: formRes.data.description,
          questions: formRes.data.questions ?? [],
        });
        setResponses(
          [...responsesRes.data].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          ),
        );
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Failed to load form",
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, id, router]);

  if (responses.length > 0 && responseIndex >= responses.length) {
    setResponseIndex(0);
  }

  const summary = useMemo<SummarySection[]>(() => {
    if (!form) return [];
    return form.questions.map((q) => {
      const questionAnswers = responses
        .map((r) => r.answers.find((a) => a.question_id === q.id))
        .filter((a): a is ResponseAnswer => Boolean(a));

      if (q.answer_type === "text") {
        const values = questionAnswers
          .map((a) => a.text_answer?.trim() ?? "")
          .filter((v) => v.length > 0);
        return { question: q, values };
      }

      const counts = new Map<string, number>();
      for (const a of questionAnswers) {
        for (const value of a.select_answer ?? []) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      const entries = [...counts.entries()]
        .map(([option, count]) => ({ option, count }))
        .sort((a, b) => b.count - a.count);
      const maxCount = Math.max(0, ...entries.map((e) => e.count));
      const total = entries.reduce((sum, e) => sum + e.count, 0);
      return { question: q, entries, maxCount, total };
    });
  }, [form, responses]);

  async function handleUnpublish() {
    if (!token || unpublishing) return;
    setUnpublishing(true);
    try {
      await updateForm(token, id, { is_published: false });
      toast.success("Form unpublished");
      router.push(`/forms/${id}/edit`);
    } catch (err) {
      setUnpublishing(false);
      toast.error(
        err instanceof ApiError ? err.message : "Failed to unpublish form",
      );
    }
  }

  async function handleDelete() {
    if (!token || deleting) return;
    setDeleting(true);
    try {
      await deleteForm(token, id);
      setDeleteOpen(false);
      toast.success("Form deleted");
      router.push("/dashboard");
    } catch (err) {
      setDeleteOpen(false);
      setDeleting(false);
      toast.error(
        err instanceof ApiError ? err.message : "Failed to delete form",
      );
    }
  }

  if (status !== "authenticated" || !session?.accessToken) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const responseCount = responses.length;
  const lastResponse = responses[responses.length - 1]?.created_at;
  const currentResponse = responses[responseIndex] ?? responses[0];
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/forms/public/${id}`
      : "";

  return (
    <>
      <Suspense fallback={null}>
        <SheetsOutcomeToast formId={id} />
      </Suspense>
      <div className="mb-8">
        <div className="flex items-start gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            aria-label="Back to dashboard"
            className="mt-1 shrink-0"
          >
            <Link href="/dashboard">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {form.title}
              </h1>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
              >
                <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
                Published
              </Badge>
            </div>
            {form.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {form.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ShareButton formId={id} variant="default" label="Share" />
              <ExportButton formId={id} />
              <Button
                variant="outline"
                onClick={handleUnpublish}
                disabled={unpublishing || deleting}
              >
                {unpublishing && <Loader2 className="size-4 animate-spin" />}
                Unpublish
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={deleting}
              >
                <Trash2 />
                Delete
              </Button>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-4">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Responses
                </dt>
                <dd className="text-lg font-semibold tracking-tight">
                  {responseCount}
                </dd>
              </div>
              <Separator
                orientation="vertical"
                className="hidden h-8 sm:block"
              />
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Questions
                </dt>
                <dd className="text-lg font-semibold tracking-tight">
                  {form.questions.length}
                </dd>
              </div>
              <Separator
                orientation="vertical"
                className="hidden h-8 sm:block"
              />
              <div className="col-span-2 flex flex-col gap-0.5 sm:col-span-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Last response
                </dt>
                <dd className="text-lg font-semibold tracking-tight">
                  {lastResponse ? formatDate(lastResponse) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {responseCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium">No responses yet</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Share your form link to start collecting responses
          </p>
          <div className="flex w-full max-w-sm items-center gap-2">
            <div className="flex h-8 min-w-0 flex-1 items-center rounded-lg border border-input bg-muted/50 px-2.5 text-sm text-muted-foreground">
              <span className="truncate">{publicUrl}</span>
            </div>
            <ShareButton formId={id} variant="default" label="Copy link" />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="summary">
          <TabsList variant="line">
            <TabsTrigger value="summary" className="px-3">
              Summary
            </TabsTrigger>
            <TabsTrigger value="individual" className="px-3">
              Individual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <Card className="gap-0 py-0">
              {summary.map((section, index) => (
                <Fragment key={section.question.id}>
                  {index > 0 && <Separator />}
                  <CardContent className="py-4">
                    <SummarySection section={section} index={index} />
                  </CardContent>
                </Fragment>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="individual" className="mt-6">
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={responseIndex === 0}
                onClick={() => setResponseIndex((i) => i - 1)}
              >
                <ChevronLeft />
                Previous
              </Button>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Select
                  value={String(responseIndex + 1)}
                  onValueChange={(value) => setResponseIndex(Number(value) - 1)}
                >
                  <SelectTrigger
                    size="sm"
                    aria-label="Go to response"
                    className="h-7 px-1.5 font-medium text-foreground"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {responses.map((_, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                of {responseCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={responseIndex === responseCount - 1}
                onClick={() => setResponseIndex((i) => i + 1)}
              >
                Next
                <ChevronRight />
              </Button>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Response {responseIndex + 1}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(currentResponse.created_at)}
                  </span>
                </div>
              </CardHeader>
              <CardContent
                key={responseIndex}
                className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
              >
                <ResponseAnswers
                  questions={form.questions}
                  answers={currentResponse.answers ?? []}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{form.title}&rdquo; and all
              its responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
