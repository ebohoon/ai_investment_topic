import { generateResearchQuestions } from "../lib/explorationOpenai.js";
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

    if (raw.includes("OPENAI_API_KEY")) {
      return { status: 503, body: { error: raw } };
    }
    if (/rate limit|429|too many requests/i.test(raw)) {
      return {
        status: 503,
        body: { error: "요청이 많아 잠시 후 다시 시도해 주세요." },
      };
    }

    return {
      status: 500,
      body: {
        error: "일시적으로 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      },
    };
  }
}
