import OpenAI from "openai";
import { readRuntimeEnv } from "./runtimeEnv.js";
import { FEW_SHOT_ASSISTANT, buildSystemPrompt } from "../prompts/system.js";
import type { RecommendBody } from "../schemas/input.js";
import { buildRecommendResponseJsonSchema } from "../schemas/recommendJsonSchema.js";
import {
  recommendResponseSchema,
  type RecommendResponse,
} from "../schemas/output.js";

function buildUserContent(body: RecommendBody, allowedSubjects: string[]): string {
  const constraintLines = [
    body.constraintPeriod && `기간: ${body.constraintPeriod}`,
    body.constraintPlace && `장소·환경: ${body.constraintPlace}`,
    body.constraintTeam && `진행 방식: ${body.constraintTeam}`,
    body.constraintBudget && `비용·재료: ${body.constraintBudget}`,
    body.constraintsExtra?.trim() && `기타: ${body.constraintsExtra.trim()}`,
  ].filter(Boolean) as string[];
  const constraintBlock =
    constraintLines.length > 0
      ? `탐구 조건(학생 선택):\n${constraintLines.join("\n")}`
      : null;

  const opt = [
    body.mbtiOrTrait ? `성향/MBTI: ${body.mbtiOrTrait}` : null,
    body.gradeLevel ? `내신 수준(자기평가): ${body.gradeLevel}` : null,
    body.performanceExperience
      ? `수행평가·탐구 경험: ${body.performanceExperience}`
      : null,
    body.inquiryStyle ? `희망 탐구 방식: ${body.inquiryStyle}` : null,
    constraintBlock,
  ]
    .filter(Boolean)
    .join("\n");

  const gradeDepthByYear: Record<(typeof body.grade), string> = {
    중1:
      "학년 수준: 중1—관찰·체험·짧은 보고 중심, 분량·개념 난이도는 최저로. 안전·교사·보호자 협조가 필요한 활동은 단계에 명시.",
    중2:
      "학년 수준: 중2—중1보다 약간 확장된 탐구·정리 가능, 여전히 중학 수행 범위·시간 내 완수 가능한 규모로 조정.",
    중3:
      "학년 수준: 중3—중학교 수행평가에 맞는 깊이·분량, 고등학교 진학 전 정리·발표 역량을 고려.",
    고1:
      "학년 수준: 고1—기초 탐구·과정 서술을 충실히, 결과의 과장을 피할 것. 교과 연계는 입문 수준에서 구체적으로.",
    고2:
      "학년 수준: 고2—교과 세특·수행에 연결 가능한 구체적 과정·근거를 강조. 탐구 단계는 실행 가능하게.",
    고3:
      "학년 수준: 고3—수능·학업 부담을 고려해 기간·분량은 현실적으로. 세특·수행 연계는 명확하되 과도한 부담을 주지 말 것.",
  };
  const gradeDepth = gradeDepthByYear[body.grade];

  const profile = [
    "학생 프로필:",
    `희망 전공: ${body.major}`,
    `관심 키워드(3): ${body.keywords.join(", ")}`,
    `학년: ${body.grade}`,
    gradeDepth,
    opt || "추가 선택 정보: 없음",
    "",
    "교과 연계(subjects)는 반드시 아래 후보 문자열과 정확히 일치하는 값만 사용:",
    allowedSubjects.join(", "),
    "",
    "정책·평가 맥락: 고교학점제·과정중심 수행평가·학교생활기록부 기재요령의 취지에 맞게, 실제 수행·관찰 가능한 과정을 제시한다. 입시 합격 전략·내신 등급 조작을 암시하는 표현은 금지.",
    "",
    "출력은 시스템 JSON 스키마를 따른다. researchQuestion·processChecklist·aiEthicsNote·recordSentence를 빠짐없이 채운다. recordSentence는 참고용 초안이며 미수행을 단정하지 않는다.",
    "",
    "위 프로필에 맞는 탐구 주제를 3~5개 생성하세요. 주제 간 중복을 피하고, 탐구 유형을 다양하게 섞을 것.",
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
  const key = readRuntimeEnv("OPENAI_API_KEY");
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY가 설정되지 않았습니다. " +
        "로컬: client/server/.env 파일 | Vercel: Settings → Environment Variables 에 이름을 정확히 OPENAI_API_KEY 로 두고, " +
        "Production·Preview 등 실제 접속하는 환경에 체크한 뒤 반드시 Redeploy 하세요. (변수 추가만 하고 재배포하지 않으면 이전 빌드에는 반영되지 않습니다.)"
    );
  }

  const model = readRuntimeEnv("OPENAI_MODEL") ?? "gpt-4o-mini";
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
