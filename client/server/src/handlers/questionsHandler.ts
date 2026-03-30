import { generateResearchQuestions } from "../lib/explorationOpenai.js";
import { mapGenerationFailure } from "../lib/handlerErrors.js";
import { resolveAllowedSubjectsWithCurriculum } from "../lib/subjectRules.js";
import { saveGeneratedSession } from "../lib/sessionStore.js";
import { explorationBodySchema } from "../schemas/input.js";

export type QuestionsHandlerResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function runQuestions(rawBody: unknown): Promise<QuestionsHandlerResult> {
  const parsed = explorationBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first =
      Object.values(msg).flat()[0] ??
      parsed.error.flatten().formErrors[0] ??
      "입력이 올바르지 않습니다.";
    return { status: 400, body: { error: first, details: msg } };
  }

  const body = parsed.data;
  const allowedSubjects = resolveAllowedSubjectsWithCurriculum(
    body.selectedSubject,
    body.major,
    body.keywords,
    body.courseName
  );

  try {
    const data = await generateResearchQuestions(body, allowedSubjects);
    await saveGeneratedSession({
      input: body,
      allowedSubjects,
      questions: data.questions,
    });
    return {
      status: 200,
      body: {
        allowedSubjects,
        questions: data.questions,
      },
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "서버 오류";
    console.error("[runQuestions]", e);
    const out = mapGenerationFailure(raw);
    return { status: out.status, body: { error: out.error } };
  }
}
