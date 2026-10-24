"use client";

import { Badge } from "@/components/ui/badge";
import type { FormQuestion, ResponseAnswer } from "@/lib/form-types";

function Answer({
  answer,
}: {
  answer?: ResponseAnswer;
}) {
  if (!answer) {
    return <p className="text-muted-foreground">(no answer)</p>;
  }

  if (answer.answer_type === "text") {
    const value = answer.value?.trim();
    if (!value) {
      return <p className="text-muted-foreground">(no answer)</p>;
    }
    return <p className="whitespace-pre-wrap">{value}</p>;
  }

  if (answer.answer_type === "checkbox") {
    const values = answer.selected_options ?? [];
    if (values.length === 0) {
      return <p className="text-muted-foreground">(no answer)</p>;
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge key={value} variant="secondary">
            {value}
          </Badge>
        ))}
      </div>
    );
  }

  if (answer.answer_type === "select") {
    const value = answer.selected_option ?? "";
    if (!value) {
      return <p className="text-muted-foreground">(no answer)</p>;
    }
    return <p>{value}</p>;
  }

  return <p className="text-muted-foreground">(no answer)</p>;
}

export function ResponseAnswers({
  questions,
  answers,
}: {
  questions: FormQuestion[];
  answers: ResponseAnswer[];
}) {
  const answerByQuestion = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  );

  return (
    <div className="space-y-6">
      {questions.map((question, index) => (
        <div key={question.id}>
          <p className="text-base font-semibold">
            <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
            {question.text}
          </p>
          <div className="mt-1.5">
            <Answer answer={answerByQuestion.get(question.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}
