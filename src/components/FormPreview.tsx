"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

import { FormQuestionCard } from "@/components/FormQuestionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { FormQuestion } from "@/lib/form-types";

type FormQuestionInput = FormQuestion;

interface FormPreviewProps {
  title: string;
  description: string;
  questions: FormQuestionInput[];
}

export function FormPreview({
  title,
  description,
  questions,
}: FormPreviewProps) {
  const [answers, setAnswers] = useState<
    Record<string, string | string[]>
  >({});

  function handleChange(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <Eye className="size-4" />
        Preview mode: responses won&apos;t be saved
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {title || "Untitled Form"}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No questions added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((question, index) => (
            <FormQuestionCard
              key={question.id}
              question={question}
              index={index}
              value={answers[question.id] ?? ""}
              onChange={(value) => handleChange(question.id, value)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          This is a preview. Publish the form to collect real responses.
        </p>
        <Button type="button" disabled>
          Submit
        </Button>
      </div>
    </div>
  );
}
