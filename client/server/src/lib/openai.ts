import OpenAI from "openai";
import { FEW_SHOT_ASSISTANT, buildSystemPrompt } from "../prompts/system.js";
import type { RecommendBody } from "../schemas/input.js";
import { buildRecommendResponseJsonSchema } from "../schemas/recommendJsonSchema.js";
import {
  recommendResponseSchema,
  type RecommendResponse,
} from "../schemas/output.js";

function buildUserContent(body: RecommendBody, allowedSubjects: string[]): string {
  const opt = [
    body.mbtiOrTrait ? `성향/MBTI: ${body.mbtiOrTrait}` : null,
    body.gradeLevel ? `내신 수준(자기평가): ${body.gradeLevel}` : null,
    body.performanceExperience
      ? `수행평가·탐구 경험: ${body.performanceExperience}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const profile = [
    "학생 프로필:",
    `희망 전공: ${body.major}`,
    `관심 키워드(3): ${body.keywords.join(", ")}`,
    `학년: ${body.grade}`,
    opt || "추가 선택 정보: 없음",
    "",
    "교과 연계(subjects)는 반드시 아래 후보 문자열과 정확히 일치하는 값만 사용:",
    allowedSubjects.join(", "),
    "",
    "출력 형식은 시스템이 강제하는 JSON 스키마를 따른다. methods는 실행 가능한 구체 단계만, recordSentence는 생기부 톤으로 과장 없이.",
    "",
    "위 프로필에 맞는 탐구 주제를 3~5개 생성하세요. 주제 간 중복을 피하고 다양하게.",
  ].join("\n");

  return [
    "아래 JSON은 출력 형식·톤의 예시입니다(실제 과제 아님).",
    FEW_SHOT_ASSISTANT,
    "---",
    profile,
  ].join("\n\n");
}

function validateSubjects(
  data: RecommendResponse,
  allowedSubjects: string[]
): string | null {
  const set = new Set(allowedSubjects);
  for (const t of data.topics) {
    const bad = t.subjects.map((s) => s.trim()).filter((s) => !set.has(s));
    if (bad.length > 0) {
      return `허용되지 않은 교과: ${bad.join(", ")}. 사용 가능: ${allowedSubjects.join(", ")}`;
    }
  }
  return null;
}

async function callModel(
  client: OpenAI,
  model: string,
  system: string,
  userContent: string,
  allowedSubjects: string[]
): Promise<string> {
  const schema = buildRecommendResponseJsonSchema(allowedSubjects);

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.65,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "AiccRecommendResponse",
        strict: true,
        schema: schema as Record<string, unknown>,
      },
    },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("모델 응답이 비어 있습니다.");
  return raw;
}

export async function generateRecommendations(
  body: RecommendBody,
  allowedSubjects: string[]
): Promise<RecommendResponse> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY가 설정되지 않았습니다. " +
        "로컬: client/server/.env | Vercel: Project → Settings → Environment Variables 에 OPENAI_API_KEY 등록 후 재배포."
    );
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const client = new OpenAI({ apiKey: key });
  const system = buildSystemPrompt(allowedSubjects);
  let userContent = buildUserContent(body, allowedSubjects);

  let lastErr = "알 수 없는 오류";
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string;
    try {
      raw = await callModel(client, model, system, userContent, allowedSubjects);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "모델 호출 실패";
      userContent =
        buildUserContent(body, allowedSubjects) +
        "\n\n직전 요청이 실패했습니다. 동일 규칙으로 다시 생성하세요.";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastErr = "모델 JSON 파싱 실패";
      userContent =
        buildUserContent(body, allowedSubjects) +
        "\n\n직전 응답이 올바른 JSON이 아니었습니다. JSON 객체만 다시 출력하세요.";
      continue;
    }

    const result = recommendResponseSchema.safeParse(parsed);
    if (!result.success) {
      lastErr = result.error.flatten().formErrors.join("; ") || "스키마 불일치";
      userContent =
        buildUserContent(body, allowedSubjects) +
        `\n\n검증 오류: ${lastErr}. 규칙을 지켜 다시 생성하세요.`;
      continue;
    }

    const subErr = validateSubjects(result.data, allowedSubjects);
    if (subErr) {
      lastErr = subErr;
      userContent =
        buildUserContent(body, allowedSubjects) +
        `\n\n오류: ${subErr}. subjects 문자열을 후보 목록과 완전히 동일하게 맞추세요.`;
      continue;
    }

    return result.data;
  }

  throw new Error(lastErr);
}
