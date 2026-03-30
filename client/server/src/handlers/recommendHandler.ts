import { generateRecommendations } from "../lib/openai.js";
import { mapGenerationFailure } from "../lib/handlerErrors.js";
import { saveGeneratedSession } from "../lib/sessionStore.js";
import { resolveAllowedSubjects } from "../lib/subjectRules.js";
import { recommendBodySchema } from "../schemas/input.js";

export type RecommendHandlerResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function runRecommend(rawBody: unknown): Promise<RecommendHandlerResult> {
  const parsed = recommendBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first =
      Object.values(msg).flat()[0] ??
      parsed.error.flatten().formErrors[0] ??
      "입력이 올바르지 않습니다.";
    return { status: 400, body: { error: first, details: msg } };
  }

  const body = parsed.data;
  const allowedSubjects = resolveAllowedSubjects(body.major, body.keywords);

  try {
    const data = await generateRecommendations(body, allowedSubjects);
    await saveGeneratedSession({
      input: body,
      allowedSubjects,
      topics: data.topics,
    });
    return {
      status: 200,
      body: {
        allowedSubjects,
        topics: data.topics,
      },
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "서버 오류";
    console.error("[runRecommend]", e);
    const out = mapGenerationFailure(raw);
    return { status: out.status, body: { error: out.error } };
  }
}
