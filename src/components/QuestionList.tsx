"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/QuestionCard";

import type { FormQuestion } from "@/lib/form-types";

type FormQuestionInput = FormQuestion;

interface QuestionListProps {
  questions: FormQuestionInput[];
  activeCardId: string | null;
  aiTouchedIds: Set<string>;
  onQuestionChange: (index: number, updated: FormQuestionInput) => void;
  onDelete: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAdd: () => void;
  onActivate: (id: string) => void;
}

interface SortableQuestionCardProps {
  question: FormQuestionInput;
  index: number;
  active: boolean;
  aiTouched: boolean;
  isOnly: boolean;
  onChange: (updated: FormQuestionInput) => void;
  onDelete: () => void;
  onActivate: () => void;
}

function SortableQuestionCard({
  question,
  index,
  active,
  aiTouched,
  isOnly,
  onChange,
  onDelete,
  onActivate,
}: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionCard
        active={active}
        aiTouched={aiTouched}
        question={question}
        index={index}
        onChange={onChange}
        onDelete={onDelete}
        onActivate={onActivate}
        isOnly={isOnly}
        isDragging={isDragging}
        dragHandleRef={setActivatorNodeRef}
        dragHandleProps={attributes}
        dragHandleListeners={listeners}
      />
    </div>
  );
}

export function QuestionList({
  questions,
  activeCardId,
  aiTouchedIds,
  onQuestionChange,
  onDelete,
  onReorder,
  onAdd,
  onActivate,
}: QuestionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = questions.findIndex((q) => q.id === active.id);
    const toIndex = questions.findIndex((q) => q.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;

    onReorder(fromIndex, toIndex);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={questions.map((q) => q.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {questions.map((question, index) => (
            <SortableQuestionCard
              key={question.id}
              active={activeCardId === question.id}
              aiTouched={aiTouchedIds.has(question.id)}
              question={question}
              index={index}
              onChange={(updated) => onQuestionChange(index, updated)}
              onDelete={() => onDelete(index)}
              onActivate={() => onActivate(question.id)}
              isOnly={questions.length <= 1}
            />
          ))}

          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={onAdd}
          >
            <Plus className="size-4" />
            Add question
          </Button>
        </div>
      </SortableContext>
    </DndContext>
  );
}
