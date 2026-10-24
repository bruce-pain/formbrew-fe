"use client";

import { type Ref } from "react";
import { GripHorizontal, Sparkles, Trash2 } from "lucide-react";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectOptionList } from "@/components/SelectOptionList";
import { Switch } from "@/components/ui/switch";
import { UnderlineTextarea } from "@/components/ui/underline-input";

import { asChoiceQuestion, asTextQuestion, isChoiceQuestion, type FormQuestion } from "@/lib/form-types";

type FormQuestionInput = FormQuestion;

interface QuestionCardProps {
  active: boolean;
  aiTouched: boolean;
  question: FormQuestionInput;
  index: number;
  onChange: (updated: FormQuestionInput) => void;
  onDelete: () => void;
  onActivate: () => void;
  isOnly: boolean;
  isDragging?: boolean;
  dragHandleRef?: Ref<HTMLButtonElement>;
  dragHandleProps?: DraggableAttributes;
  dragHandleListeners?: DraggableSyntheticListeners;
}

export function QuestionCard({
  active,
  aiTouched,
  question,
  index,
  onChange,
  onDelete,
  onActivate,
  isOnly,
  isDragging = false,
  dragHandleRef,
  dragHandleProps,
  dragHandleListeners,
}: QuestionCardProps) {
  function handleDragHandleMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleDragHandleClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  const dragHandle = (
    <button
      ref={dragHandleRef}
      title="Reorder question"
      className={`-mx-5 -mt-5 mb-3 flex w-[calc(100%+2.5rem)] cursor-grab touch-none items-center justify-center rounded-t-md py-1 text-muted-foreground/50 active:cursor-grabbing ${
        active
          ? ""
          : "pointer-events-none opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
      }`}
      {...dragHandleProps}
      {...dragHandleListeners}
      onMouseDown={handleDragHandleMouseDown}
      onClick={handleDragHandleClick}
    >
      <GripHorizontal className="size-4" />
    </button>
  );

  function handleAnswerTypeChange(value: string) {
    if (value === "text") {
      onChange(asTextQuestion(question));
    } else if (value === "select") {
      onChange(asChoiceQuestion(question, "select"));
    } else if (value === "checkbox") {
      onChange(asChoiceQuestion(question, "checkbox"));
    }
  }

  if (active) {
    return (
      <div
        className={`rounded-md border bg-card p-5 ring-2 ring-primary shadow-md ${
          isDragging ? "z-10 opacity-90" : ""
        }`}
      >
        {dragHandle}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Question {index + 1}
            </span>
            {aiTouched && (
              <Badge className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400">
                <Sparkles className="size-3" />
                New
              </Badge>
            )}
          </div>
          {!isOnly && (
            <Button variant="ghost" size="icon-sm" onClick={onDelete}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <UnderlineTextarea
            value={question.text}
            onChange={(e) => onChange({ ...question, text: e.target.value })}
            placeholder="Enter your question..."
            className="resize-none text-sm"
            rows={1}
          />

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">
                Answer type
              </Label>
              <Select
                value={question.answer_type}
                onValueChange={handleAnswerTypeChange}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="select">Single choice</SelectItem>
                  <SelectItem value="checkbox">Multiple choice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={question.required}
                onCheckedChange={(v) => onChange({ ...question, required: v })}
                size="sm"
              />
              Required
            </Label>
          </div>

          {isChoiceQuestion(question) && (
            <SelectOptionList
              options={question.options ?? []}
              onChange={(opts) =>
                onChange({ ...question, options: opts } as FormQuestionInput)
              }
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onActivate}
      className={`group cursor-pointer rounded-md border bg-card p-5 transition-colors hover:bg-muted/50 ${
        isDragging ? "z-10 opacity-90" : ""
      }`}
    >
      {dragHandle}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Question {index + 1}
          </span>
          {aiTouched && (
            <Badge className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400">
              <Sparkles className="size-3" />
              New
            </Badge>
          )}
        </div>
      </div>

      <p className="mb-3 text-sm font-medium">
        {question.text || (
          <span className="italic text-muted-foreground/50">
            Untitled question
          </span>
        )}
        {question.required && (
          <span className="ml-0.5 text-destructive">*</span>
        )}
      </p>

      {question.answer_type === "text" ? (
        <div className="border-b border-input pb-1.5 text-sm text-muted-foreground/60">
          Your answer
        </div>
      ) : (
        <div className="space-y-1.5">
          {isChoiceQuestion(question) && question.options.length > 0 ? (
            question.options.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <div
                  className={`shrink-0 border border-muted-foreground/30 ${
                    question.answer_type === "checkbox"
                      ? "size-4 rounded-sm"
                      : "size-4 rounded-full"
                  }`}
                />
                <span className="text-sm text-muted-foreground">{option}</span>
              </div>
            ))
          ) : (
            <div className="border-b border-input pb-1.5 text-sm text-muted-foreground/60">
              No options configured
            </div>
          )}
        </div>
      )}
    </div>
  );
}
