import OpenAI from "openai";
import {
  buildDesignSystemPrompt,
  buildQuestionsSystemPrompt,
  FEW_SHOT_DESIGN_ASSISTANT,
  FEW_SHOT_DESIGN_ASSISTANT_GENERAL,
} from "../prompts/system.js";
import { inferInitialAnalysisProcessKind } from "./initialAnalysisProfile.js";
import type { ExplorationBody } from "../schemas/input.js";
import { isMiddleSchoolGrade } from "./middleCurriculum.js";
import { buildExplorationDesignJsonSchema } from "../schemas/designJsonSchema.js";
import { buildQuestionsResponseJsonSchema } from "../schemas/questionsJsonSchema.js";
import {
  explorationDesignSchema,
  questionsResponseSchema,
  type ExplorationDesign,
  type QuestionsResponse,
} from "../schemas/output.js";
import { readRuntimeEnv } from "./runtimeEnv.js";
import { normalizeExplorationDesignPayload } from "./urlPolicy.js";
import { summarizeZodError } from "./zodErrorSummary.js";

/** 모델이 ---, ___ 등만 넣는 경우 화면에 의미 없는 표가 되어 치환 */
function isPlaceholderComparisonCell(cell: string): boolean {
  const t = cell.trim();
  if (t === "") return true;
  if (/^(?:___|…|\.{3,})$/.test(t)) return true;
  if (/^[\-_]{2,}$/.test(t)) return true;
  if (/^=+$/.test(t)) return true;
  return false;
}

const COMPARISON_CELL_PLACEHOLDER_HINT =
  "※ 이 칸에는 비교 대상별로 측정·관찰·설문 결과를 한국어로 한 줄 이상 적습니다(가상 수치·임의 단정 금지).";

function sanitizeComparisonTable(
  table: ExplorationDesign["comparisonTable"]
): ExplorationDesign["comparisonTable"] {
  return {
    columnHeaders: table.columnHeaders,
    rows: table.rows.map((row) => ({
      cells: row.cells.map((c) =>
        isPlaceholderComparisonCell(c) ? COMPARISON_CELL_PLACEHOLDER_HINT : c
      ),
    })),
  };
}

function withSanitizedComparisonTable(d: ExplorationDesign): ExplorationDesign {
  return { ...d, comparisonTable: sanitizeComparisonTable(d.comparisonTable) };
}

function buildExplorationContext(
  body: ExplorationBody,
  allowedSubjects: string[]
): string {
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

  const curriculumLine =
    body.selectedSubject === "기타"
      ? `세부 교과·과목(직접 입력): ${body.courseName?.trim() ?? ""}`
      : isMiddleSchoolGrade(body.grade)
        ? [
            "2022 개정 중학교 과정:",
            `교과(군): ${body.selectedSubject}`,
            body.courseName?.trim() ? `과목명: ${body.courseName.trim()}` : "",
          ]
            .filter(Boolean)
            .join(" | ")
        : [
            "2022 개정 고등학교 과목 선택:",
            `교과(군): ${body.selectedSubject}`,
            body.courseCategory ? `선택 유형: ${body.courseCategory}` : "",
            body.courseName?.trim() ? `과목명: ${body.courseName.trim()}` : "",
          ]
            .filter(Boolean)
            .join(" | ");

  const gradeDepthByYear: Record<(typeof body)["grade"], string> = {
    중1: "학년: 중1—관찰·짧은 보고 중심, 최저 난이도.",
    중2: "학년: 중2—중1보다 약간 확장, 중학 수행 범위.",
    중3: "학년: 중3—중학 수행 깊이·분량.",
    고1: "학년: 고1—기초 탐구·과정 서술, 과장 금지.",
    고2: "학년: 고2—세특·수행 연계 구체적 근거.",
    고3: "학년: 고3—기간·분량 현실적으로.",
  };

  return [
    "=== 교과 기반 탐구 설계 입력 ===",
    `선택 교과(군): ${body.selectedSubject}`,
    curriculumLine,
    `희망 전공: ${body.major}`,
    `관심 키워드: ${body.keywords.join(", ")}`,
    body.interestTopicDetail?.trim() &&
      `관심 주제 상세(선택): ${body.interestTopicDetail.trim()}`,
    `학년: ${body.grade}`,
    gradeDepthByYear[body.grade],
    `탐구 유형: ${body.inquiryType}`,
    `탐구 목표 수준: ${body.goalLevel}`,
    `결과 형태: ${body.outputFormat}`,
    `AI 활용 수준: ${body.aiUsageLevel}`,
    body.mbtiOrTrait?.trim() && `성향/MBTI: ${body.mbtiOrTrait.trim()}`,
    body.gradeLevel?.trim() && `내신 수준(자기평가): ${body.gradeLevel.trim()}`,
    body.performanceExperience?.trim() &&
      `수행·탐구 경험: ${body.performanceExperience.trim()}`,
    body.inquiryStyle && `희망 탐구 방식(기존 항목): ${body.inquiryStyle}`,
    constraintBlock,
    "",
    "교과 연계 후보(정확히 일치하는 문자열만 설계의 subjects에 사용):",
    allowedSubjects.join(", "),
    "",
    "정책: 고교학점제·과정중심 수행·생기부 기재요령 취지. 입시 합격 전략·내신 조작 암시 금지.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildQuestionsUserContent(
  body: ExplorationBody,
  allowedSubjects: string[]
): string {
  return [
    "아래는 학생 입력입니다. 탐구 질문 후보만 JSON으로 생성하세요.",
    "---",
    buildExplorationContext(body, allowedSubjects),
    "",
    "요구: questions 3~5개. 각 질문은 측정·탐구 가능하고, 선택한 탐구 유형과 결과 형태에 맞아야 합니다.",
  ].join("\n\n");
}

function buildDesignUserContent(
  body: ExplorationBody,
  allowedSubjects: string[],
  selectedQuestion: string,
  processKind: ReturnType<typeof inferInitialAnalysisProcessKind>
): string {
  const fewShot =
    processKind === "data_ai"
      ? FEW_SHOT_DESIGN_ASSISTANT
      : FEW_SHOT_DESIGN_ASSISTANT_GENERAL;
  return [
    "아래는 학생 입력과 선택된 탐구 질문 하나입니다. 이 질문에 대응하는 탐구 활동 설계를 JSON으로 생성하세요.",
    fewShot,
    "---",
    buildExplorationContext(body, allowedSubjects),
    "",
    "【학생이 선택한 탐구 질문】",
    selectedQuestion,
  ].join("\n\n");
}

function validateDesignSubjects(
  data: ExplorationDesign,
  allowedSubjects: string[]
): string | null {
  const set = new Set(allowedSubjects);
  const bad = data.subjects.map((s) => s.trim()).filter((s) => !set.has(s));
  if (bad.length > 0) {
    return `허용되지 않은 교과: ${bad.join(", ")}. 사용 가능: ${allowedSubjects.join(", ")}`;
  }
  return null;
}

async function callQuestionsModel(
  client: OpenAI,
  model: string,
  system: string,
  userContent: string
): Promise<string> {
  const schema = buildQuestionsResponseJsonSchema();
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.55,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "AiccResearchQuestions",
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

async function callDesignModel(
  client: OpenAI,
  model: string,
  system: string,
  userContent: string,
  allowedSubjects: string[],
  processKind: ReturnType<typeof inferInitialAnalysisProcessKind>
): Promise<string> {
  const schema = buildExplorationDesignJsonSchema(allowedSubjects, processKind);
  const t0 = Date.now();
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.55,
    /** 스키마 축소 후에도 여유 두고 상한 — 무한 길이 생성·지연 완화 */
    max_completion_tokens: 16_000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "AiccExplorationDesign",
        strict: true,
        schema: schema as Record<string, unknown>,
      },
    },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  });
  const ms = Date.now() - t0;
  const usage = completion.usage;
  console.info(
    "[explorationOpenai] design completion",
    `${ms}ms`,
    usage
      ? `prompt_tokens=${usage.prompt_tokens} completion_tokens=${usage.completion_tokens} total=${usage.total_tokens}`
      : "(usage n/a)"
  );
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("모델 응답이 비어 있습니다.");
  return raw;
}

function openAiKeyError(): Error {
  return new Error(
    "OPENAI_API_KEY가 설정되지 않았습니다. " +
      "로컬: client/server/.env 파일 | Vercel: Settings → Environment Variables 에 이름을 정확히 OPENAI_API_KEY 로 두고, " +
      "Production·Preview 등 실제 접속하는 환경에 체크한 뒤 반드시 Redeploy 하세요."
  );
}

export async function generateResearchQuestions(
  body: ExplorationBody,
  allowedSubjects: string[]
): Promise<QuestionsResponse> {
  const key = readRuntimeEnv("OPENAI_API_KEY");
  if (!key) throw openAiKeyError();

  const model = readRuntimeEnv("OPENAI_MODEL") ?? "gpt-4o-mini";
  const client = new OpenAI({ apiKey: key });
  const system = buildQuestionsSystemPrompt(allowedSubjects);
  let userContent = buildQuestionsUserContent(body, allowedSubjects);

  let lastErr = "알 수 없는 오류";
  for (let attempt = 0; attempt < 3; attempt++) {
    let raw: string;
    try {
      raw = await callQuestionsModel(client, model, system, userContent);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "모델 호출 실패";
      console.error("[generateResearchQuestions] model call", lastErr);
      userContent =
        buildQuestionsUserContent(body, allowedSubjects) +
        "\n\n직전 요청이 실패했습니다. 동일 규칙으로 questions만 다시 출력하세요.";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastErr = "모델 JSON 파싱 실패";
      userContent =
        buildQuestionsUserContent(body, allowedSubjects) +
        "\n\n올바른 JSON 객체만 다시 출력하세요.";
      continue;
    }

    const result = questionsResponseSchema.safeParse(parsed);
    if (!result.success) {
      lastErr = summarizeZodError(result.error);
      console.error("[generateResearchQuestions] zod", lastErr);
      userContent =
        buildQuestionsUserContent(body, allowedSubjects) +
        `\n\n검증 오류(반드시 수정): ${lastErr}. 규칙을 지켜 다시 생성하세요.`;
      continue;
    }

    return result.data;
  }

  throw new Error(lastErr);
}

export async function generateExplorationDesign(
  body: ExplorationBody,
  allowedSubjects: string[],
  selectedQuestion: string
): Promise<ExplorationDesign> {
  const key = readRuntimeEnv("OPENAI_API_KEY");
  if (!key) throw openAiKeyError();

  const processKind = inferInitialAnalysisProcessKind(body.inquiryType);
  const model = readRuntimeEnv("OPENAI_MODEL") ?? "gpt-4o-mini";
  const client = new OpenAI({ apiKey: key });
  const system = buildDesignSystemPrompt(
    allowedSubjects,
    body,
    selectedQuestion,
    processKind
  );
  let userContent = buildDesignUserContent(
    body,
    allowedSubjects,
    selectedQuestion,
    processKind
  );

  let lastErr = "알 수 없는 오류";
  const designStarted = Date.now();
  for (let attempt = 0; attempt < 4; attempt++) {
    let raw: string;
    try {
      raw = await callDesignModel(
        client,
        model,
        system,
        userContent,
        allowedSubjects,
        processKind
      );
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "모델 호출 실패";
      console.error("[generateExplorationDesign] model call", lastErr);
      userContent =
        buildDesignUserContent(body, allowedSubjects, selectedQuestion, processKind) +
        "\n\n직전 요청이 실패했습니다. 동일 규칙으로 설계 JSON만 다시 출력하세요.";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastErr = "모델 JSON 파싱 실패";
      userContent =
        buildDesignUserContent(body, allowedSubjects, selectedQuestion, processKind) +
        "\n\n올바른 JSON 객체만 다시 출력하세요.";
      continue;
    }

    normalizeExplorationDesignPayload(parsed);

    const result = explorationDesignSchema.safeParse(parsed);
    if (!result.success) {
      lastErr = summarizeZodError(result.error);
      console.error("[generateExplorationDesign] zod", lastErr);
      userContent =
        buildDesignUserContent(body, allowedSubjects, selectedQuestion, processKind) +
        `\n\n검증 오류(반드시 수정): ${lastErr}. 필드별 최소 길이·개수·phase 순서·URL 규칙을 정확히 맞추세요.`;
      continue;
    }

    if (result.data.initialAnalysisProcessKind !== processKind) {
      lastErr = `initialAnalysisProcessKind는 "${processKind}"이어야 합니다.`;
      userContent =
        buildDesignUserContent(body, allowedSubjects, selectedQuestion, processKind) +
        `\n\n※ initialAnalysisProcessKind를 반드시 "${processKind}"로 두고, 탐구 과정 단계별 실행 방안(initialAnalysisExamples)의 phase 순서를 탐구 유형에 맞추세요.`;
      continue;
    }

    const subErr = validateDesignSubjects(result.data, allowedSubjects);
    if (subErr) {
      lastErr = subErr;
      userContent =
        buildDesignUserContent(body, allowedSubjects, selectedQuestion, processKind) +
        `\n\n오류: ${subErr}. subjects는 후보 목록과 완전히 동일하게.`;
      continue;
    }

    console.info(
      "[explorationOpenai] generateExplorationDesign ok",
      `${Date.now() - designStarted}ms`,
      `attempts=${attempt + 1}`
    );
    return withSanitizedComparisonTable(result.data);
  }

  throw new Error(lastErr);
}
