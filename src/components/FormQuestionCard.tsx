"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UnderlineTextarea } from "@/components/ui/underline-input";

import { isChoiceQuestion, type FormQuestion } from "@/lib/form-types";

interface FormQuestionCardProps {
  question: FormQuestion;
  index: number;
  value: string | string[];
  error?: string;
  onChange: (value: string | string[]) => void;
}

function QuestionText({
  question,
  index,
  className,
}: {
  question: FormQuestion;
  index: number;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
      {question.text || "Untitled question"}
      {question.required && <span className="ml-0.5 text-destructive">*</span>}
    </span>
  );
}

export function FormQuestionCard({
  question,
  index,
  value,
  error,
  onChange,
}: FormQuestionCardProps) {
  const invalid = Boolean(error);
  const options = isChoiceQuestion(question) ? question.options : [];
  const id = `question-${question.id}`;

  return (
    <Card id={id} className="scroll-mt-6">
      <CardContent>
        {question.answer_type === "text" ? (
          <Field data-invalid={invalid}>
            <FieldLabel htmlFor={`${id}-answer`} className="text-base leading-snug">
              <QuestionText question={question} index={index} />
            </FieldLabel>
            <UnderlineTextarea
              id={`${id}-answer`}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer"
              aria-invalid={invalid}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
        ) : question.answer_type === "checkbox" ? (
          <FieldSet className="gap-3">
            <FieldLegend
              variant="label"
              className={error ? "text-destructive" : undefined}
            >
              <QuestionText question={question} index={index} />
            </FieldLegend>
            <FieldDescription>Select all that apply.</FieldDescription>
            {options.map((option, optionIndex) => {
              const selected = Array.isArray(value) ? value : [];
              const optionId = `${id}-option-${optionIndex}`;
              return (
                <Field
                  orientation="horizontal"
                  key={option}
                  data-invalid={invalid}
                >
                  <Checkbox
                    id={optionId}
                    checked={selected.includes(option)}
                    onCheckedChange={(checked) => {
                      onChange(
                        checked
                          ? [...selected, option]
                          : selected.filter((o) => o !== option),
                      );
                    }}
                    aria-invalid={invalid}
                  />
                  <FieldLabel htmlFor={optionId} className="font-normal">
                    {option}
                  </FieldLabel>
                </Field>
              );
            })}
            {error && <FieldError>{error}</FieldError>}
          </FieldSet>
        ) : (
          <FieldSet>
            <FieldLegend
              variant="label"
              className={error ? "text-destructive" : undefined}
            >
              <QuestionText question={question} index={index} />
            </FieldLegend>
            <RadioGroup
              value={typeof value === "string" ? value : ""}
              onValueChange={(option) => onChange(option)}
              aria-invalid={invalid}
            >
              {options.map((option, optionIndex) => {
                const optionId = `${id}-option-${optionIndex}`;
                return (
                  <Field
                    orientation="horizontal"
                    key={option}
                    data-invalid={invalid}
                  >
                    <RadioGroupItem
                      value={option}
                      id={optionId}
                      aria-invalid={invalid}
                    />
                    <FieldLabel htmlFor={optionId} className="font-normal">
                      {option}
                    </FieldLabel>
                  </Field>
                );
              })}
            </RadioGroup>
            {error && <FieldError>{error}</FieldError>}
          </FieldSet>
        )}
      </CardContent>
    </Card>
  );
}
