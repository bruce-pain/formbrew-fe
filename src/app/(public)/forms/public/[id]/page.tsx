"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FormQuestionCard } from "@/components/FormQuestionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { ApiError } from "@/lib/api";
import { getPublicForm, submitFormResponse } from "@/lib/public-form";

import type { FormQuestion } from "@/lib/form-types";
import type { components } from "@/lib/api.types";

type ResponseAnswerInput = components["schemas"]["app__features__response__schemas__FormResponseData"]["answers"][number];

interface FormData {
  title: string;
  description: string;
  questions: FormQuestion[];
}

function PoweredByFooter() {
  return (
    <footer className="text-center text-xs text-muted-foreground">
      <Link href="/" className="hover:underline">
        Powered by Formbrew
      </Link>
    </footer>
  );
}

export default function PublicFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [form, setForm] = useState<FormData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getPublicForm(id)
      .then((res) => {
        if (cancelled) return;
        setForm({
          title: res.data.title,
          description: res.data.description,
          questions: res.data.questions ?? [],
        });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleChange(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function validate(): string | null {
    if (!form) return null;
    const nextErrors: Record<string, string> = {};
    let firstInvalid: string | null = null;

    for (const question of form.questions) {
      if (!question.required) continue;
      const value = answers[question.id];
      let isEmpty = false;
      if (question.answer_type === "text") {
        isEmpty = typeof value !== "string" || value.trim().length === 0;
      } else if (question.answer_type === "select") {
        isEmpty = typeof value !== "string" || value.length === 0;
      } else if (question.answer_type === "checkbox") {
        isEmpty = !Array.isArray(value) || value.length === 0;
      }

      if (isEmpty) {
        nextErrors[question.id] = "This question is required";
        if (!firstInvalid) firstInvalid = question.id;
      }
    }

    setErrors(nextErrors);
    return firstInvalid;
  }

  function focusQuestion(questionId: string) {
    const node = document.getElementById(`question-${questionId}`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    const control = node.querySelector(
      "textarea, input, [role=radio], [role=checkbox]",
    );
    (control as HTMLElement | null)?.focus?.();
  }

  function buildAnswers(): ResponseAnswerInput[] {
    if (!form) return [];
    const result: ResponseAnswerInput[] = [];

    for (const question of form.questions) {
      const value = answers[question.id];

      if (question.answer_type === "text") {
        const text = typeof value === "string" ? value.trim() : "";
        if (!text) continue;
        result.push({
          question_id: question.id,
          answer_type: "text",
          value: text,
        } as ResponseAnswerInput);
        continue;
      }

      if (question.answer_type === "select") {
        const selected =
          typeof value === "string" && value.trim() ? value.trim() : null;
        if (!selected) continue;
        result.push({
          question_id: question.id,
          answer_type: "select",
          selected_option: selected,
        } as ResponseAnswerInput);
        continue;
      }

      if (question.answer_type === "checkbox") {
        const selected = Array.isArray(value)
          ? value.filter((v) => typeof v === "string" && v.trim())
          : [];
        if (selected.length === 0) continue;
        result.push({
          question_id: question.id,
          answer_type: "checkbox",
          selected_options: selected,
        } as ResponseAnswerInput);
        continue;
      }
    }

    return result;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || submitting) return;

    const firstInvalid = validate();
    if (firstInvalid) {
      focusQuestion(firstInvalid);
      return;
    }

    setSubmitting(true);
    try {
      await submitFormResponse(id, buildAnswers());
      setSubmitted(true);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to submit response",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setAnswers({});
    setErrors({});
    setSubmitted(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading form...</p>
      </main>
    );
  }

  if (loadError || !form) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-2">
            <h1 className="text-lg font-medium">This form isn&apos;t available</h1>
            <p className="text-sm text-muted-foreground">
              The form you&apos;re looking for doesn&apos;t exist or hasn&apos;t
              been published.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link href="/">Go to home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
              <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-lg font-medium">Response submitted</h1>
            <p className="text-sm text-muted-foreground">
              Thanks for completing &ldquo;{form.title}&rdquo;.
            </p>
            <Button variant="outline" className="mt-2" onClick={handleReset}>
              Submit another response
            </Button>
          </CardContent>
        </Card>
        <div className="mt-8">
          <PoweredByFooter />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-4 py-12">
      <Card>
        <CardContent className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {form.title || "Untitled Form"}
          </h1>
          {form.description && (
            <p className="text-sm text-muted-foreground">{form.description}</p>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {form.questions.map((question, index) => (
          <FormQuestionCard
            key={question.id}
            question={question}
            index={index}
            value={answers[question.id] ?? ""}
            error={errors[question.id]}
            onChange={(value) => handleChange(question.id, value)}
          />
        ))}

        <div className="mt-2 flex justify-end">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <PoweredByFooter />
      </div>
    </main>
  );
}
