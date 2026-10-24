import { publicFetch } from "@/lib/api";
import type { components } from "@/lib/api.types";

type FormResponse = components["schemas"]["app__features__form__schemas__FormResponse"];
type ResponseAnswerInput =
  components["schemas"]["FormResponseCreateRequest"]["answers"][number];

export async function getPublicForm(id: string): Promise<FormResponse> {
  return publicFetch(`/api/v1/forms/public/${id}`);
}

export async function submitFormResponse(
  id: string,
  answers: ResponseAnswerInput[],
): Promise<FormResponse> {
  return publicFetch(`/api/v1/forms/${id}/responses`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}
