"use client";

import { Fragment, useState } from "react";

import { FormQuestionCard } from "@/components/FormQuestionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { FormQuestion } from "@/lib/form-types";

const SAMPLE_FORM: { title: string; description: string; questions: FormQuestion[] } = {
  title: "Café Feedback",
  description: "Three quick questions about your last visit.",
  questions: [
    {
      id: "q1",
      text: "How did you hear about us?",
      answer_type: "select",
      options: ["Social media", "A friend", "Walked past", "Online search"],
      required: true,
    },
    {
      id: "q2",
      text: "What did you order?",
      answer_type: "checkbox",
      options: ["Espresso", "Latte", "Filter", "Pastry"],
      required: false,
    },
    {
      id: "q3",
      text: "Anything we could do better?",
      answer_type: "text",
      required: false,
    },
  ],
};

interface ChoiceSection {
  kind: "choices";
  index: number;
  text: string;
  unit: string;
  entries: { option: string; count: number }[];
  maxCount: number;
  total: number;
}

interface TextSection {
  kind: "text";
  index: number;
  text: string;
  values: string[];
}

type SummarySection = ChoiceSection | TextSection;

const SAMPLE_SUMMARY: SummarySection[] = [
  {
    kind: "choices",
    index: 0,
    text: "How did you hear about us?",
    unit: "response",
    entries: [
      { option: "Social media", count: 42 },
      { option: "A friend", count: 31 },
      { option: "Walked past", count: 17 },
      { option: "Online search", count: 10 },
    ],
    maxCount: 42,
    total: 100,
  },
  {
    kind: "choices",
    index: 1,
    text: "What did you order?",
    unit: "selection",
    entries: [
      { option: "Latte", count: 48 },
      { option: "Espresso", count: 26 },
      { option: "Filter", count: 15 },
      { option: "Pastry", count: 11 },
    ],
    maxCount: 48,
    total: 100,
  },
  {
    kind: "text",
    index: 2,
    text: "Anything we could do better?",
    values: [
      "Great atmosphere, more sockets please",
      "Open later on weekends",
    ],
  },
];

function PublicFormPanel() {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({
    q1: "A friend",
    q2: ["Espresso", "Latte"],
    q3: "",
  });

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{SAMPLE_FORM.title}</h1>
          <p className="text-sm text-muted-foreground">{SAMPLE_FORM.description}</p>
        </CardContent>
      </Card>

      {SAMPLE_FORM.questions.map((question, index) => (
        <FormQuestionCard
          key={question.id}
          question={question}
          index={index}
          value={answers[question.id] ?? ""}
          onChange={(value) =>
            setAnswers((prev) => ({ ...prev, [question.id]: value }))
          }
        />
      ))}

      <div className="mt-2 flex justify-end">
        <Button size="lg">Submit</Button>
      </div>
    </div>
  );
}

function SummarySectionView({ section }: { section: SummarySection }) {
  if (section.kind === "text") {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-medium">
            <span className="mr-1.5 text-muted-foreground">{section.index + 1}.</span>
            {section.text}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {section.values.length} {section.values.length === 1 ? "answer" : "answers"}
          </span>
        </div>
        <ol className="mt-3 space-y-1.5">
          {section.values.map((value, i) => (
            <li key={i} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              {value}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">
          <span className="mr-1.5 text-muted-foreground">{section.index + 1}.</span>
          {section.text}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {section.total} {section.total === 1 ? "response" : "responses"}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {section.entries.map(({ option, count }) => {
          const percent = section.total > 0 ? Math.round((count / section.total) * 100) : 0;
          return (
            <div key={option}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="min-w-0 truncate" title={option}>
                  {option}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {count} {section.unit}s ({percent}%)
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.max((count / section.maxCount) * 100, 4)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryPanel() {
  return (
    <Card className="gap-0 py-0">
      {SAMPLE_SUMMARY.map((section, index) => (
        <Fragment key={section.index}>
          {index > 0 && <Separator />}
          <CardContent className="py-4">
            <SummarySectionView section={section} />
          </CardContent>
        </Fragment>
      ))}
    </Card>
  );
}

export function Showcase() {
  return (
    <section id="showcase" className="scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Showcase
          </p>
          <h2 className="mt-4 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Brewed in seconds. Shared in one link.
          </h2>
          <p className="mt-4 max-w-lg text-pretty text-muted-foreground">
            The form your visitors see, and the summary you see, from a single prompt.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              For visitors
            </p>
            <PublicFormPanel />
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              For you
            </p>
            <SummaryPanel />
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
          sample data · brewed from &quot;a short feedback survey for a
          neighborhood coffee shop&quot;
        </p>
      </div>
    </section>
  );
}
