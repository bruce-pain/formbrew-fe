import type { FormQuestion } from "./form-types";
import { isChoiceQuestion } from "./form-types";

type FormQuestionInput = FormQuestion;

export interface FormSnapshot {
  title: string;
  description: string;
  questions: FormQuestionInput[];
}

function diffQuestion(before: FormQuestionInput, after: FormQuestionInput): string[] {
  const edits: string[] = [];
  const label = after.text.trim() || before.text.trim() || "a question";

  if (before.text !== after.text) {
    const oldLabel = before.text.trim() || "empty";
    const newLabel = after.text.trim() || "empty";
    edits.push(`[User changed "${oldLabel}" to "${newLabel}"]`);
  }

  if (before.answer_type !== after.answer_type) {
    edits.push(
      `[User changed "${label}" answer type from "${before.answer_type}" to "${after.answer_type}"]`,
    );
  }

  if (before.required !== after.required) {
    edits.push(
      `[User ${after.required ? "marked" : "unmarked"} "${label}" as ${after.required ? "required" : "not required"}]`,
    );
  }

  const beforeOpts = isChoiceQuestion(before) ? before.options : [];
  const afterOpts = isChoiceQuestion(after) ? after.options : [];

  for (const opt of afterOpts) {
    if (!beforeOpts.includes(opt)) {
      edits.push(`[User added option "${opt}" to "${label}"]`);
    }
  }
  for (const opt of beforeOpts) {
    if (!afterOpts.includes(opt)) {
      edits.push(`[User removed option "${opt}" from "${label}"]`);
    }
  }

  return edits;
}

export function computeEditCounts(
  before: FormSnapshot,
  after: FormSnapshot,
): { additions: number; removals: number; edits: number } {
  let additions = 0;
  let removals = 0;
  let edits = 0;

  for (const aq of after.questions) {
    if (!before.questions.find((q) => q.id === aq.id)) {
      additions++;
    }
  }

  for (const bq of before.questions) {
    if (!after.questions.find((q) => q.id === bq.id)) {
      removals++;
    }
  }

  for (const aq of after.questions) {
    const bq = before.questions.find((q) => q.id === aq.id);
    if (bq && diffQuestion(bq, aq).length > 0) {
      edits++;
    }
  }

  return { additions, removals, edits };
}

export function computeAiTouchedIds(
  before: FormSnapshot,
  after: FormSnapshot,
): Set<string> {
  const touched = new Set<string>();
  for (const aq of after.questions) {
    const bq = before.questions.find((q) => q.id === aq.id);
    if (!bq || diffQuestion(bq, aq).length > 0) {
      touched.add(aq.id);
    }
  }
  return touched;
}

export function buildEditsSummary(
  before: FormSnapshot,
  after: FormSnapshot,
): string {
  if (before.questions.length === 0) return "";

  const edits: string[] = [];

  if (before.title !== after.title) {
    const old = before.title || "empty";
    const neu = after.title || "empty";
    edits.push(`[User changed title from "${old}" to "${neu}"]`);
  }

  if (before.description !== after.description) {
    const old = before.description || "empty";
    const neu = after.description || "empty";
    edits.push(`[User changed description from "${old}" to "${neu}"]`);
  }

  for (const bq of before.questions) {
    const aq = after.questions.find((q) => q.id === bq.id);
    if (!aq) {
      const label = bq.text.trim() || "a question";
      edits.push(`[User deleted: "${label}"]`);
    }
  }

  for (const aq of after.questions) {
    const bq = before.questions.find((q) => q.id === aq.id);
    if (!bq) {
      const label = aq.text.trim() || "a question";
      edits.push(`[User added: "${label}"]`);
    }
  }

  for (const aq of after.questions) {
    const bq = before.questions.find((q) => q.id === aq.id);
    if (bq) {
      edits.push(...diffQuestion(bq, aq));
    }
  }

  return edits.join("\n");
}
