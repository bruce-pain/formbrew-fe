import { components } from "./api.types";

export type TextQuestion = components["schemas"]["TextQuestion"];
export type SelectQuestion = components["schemas"]["SelectQuestion"];
export type CheckboxQuestion = components["schemas"]["CheckboxQuestion"];

export type FormQuestion = TextQuestion | SelectQuestion | CheckboxQuestion;

export type TextAnswer = components["schemas"]["TextAnswer"];
export type SelectAnswer = components["schemas"]["SelectAnswer"];
export type CheckboxAnswer = components["schemas"]["CheckboxAnswer"];

export type ResponseAnswer = TextAnswer | SelectAnswer | CheckboxAnswer;

export type AnswerType = FormQuestion["answer_type"];

export function isChoiceQuestion(
  q: FormQuestion,
): q is SelectQuestion | CheckboxQuestion {
  return q.answer_type === "select" || q.answer_type === "checkbox";
}

export function asTextQuestion(q: FormQuestion): TextQuestion {
  return { id: q.id, text: q.text, required: q.required, answer_type: "text" };
}

export function asChoiceQuestion(
  q: FormQuestion,
  type: "select" | "checkbox",
): SelectQuestion | CheckboxQuestion {
  const base: SelectQuestion | CheckboxQuestion = {
    id: q.id,
    text: q.text,
    required: q.required,
    answer_type: type,
    options: isChoiceQuestion(q) ? q.options : [],
  };
  return base;
}

export function blankQuestion(id: string): TextQuestion {
  return {
    id,
    text: "",
    required: false,
    answer_type: "text",
  };
}
