/**
 * OpenAI Chat Completions `response_format: json_schema` (strict) — 실행 가능한 탐구 설계.
 */

import type { InitialAnalysisProcessKind } from "../lib/initialAnalysisProfile.js";
import { DATA_AI_PHASE_ORDER, GENERAL_PHASE_ORDER } from "../lib/initialAnalysisProfile.js";
import { RECOMMENDED_SOURCES_COUNT } from "../lib/explorationDesignLimits.js";

const SOURCE_TYPE_ENUM = ["youtube", "paper_pdf", "institution", "news"] as const;

export function buildExplorationDesignJsonSchema(
  allowedSubjects: string[],
  processKind: InitialAnalysisProcessKind
) {
  const subjectEnum =
    allowedSubjects.length > 0
      ? [...new Set(allowedSubjects)]
      : ["국어", "수학", "정보"];

  const recommendedSource = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
        minLength: 2,
        maxLength: 200,
        description:
          "그 기사·통계표·데이터셋·영상·문서를 가리키는 구체 제목. ‘○○ 홈’만 쓰지 말 것.",
      },
      url: {
        type: "string",
        minLength: 12,
        maxLength: 2000,
        description:
          "https만. 열면 바로 그 자료가 보이는 딥링크. 임의 기사번호·데이터 ID·추측 경로 금지(404·삭제 방지). youtube=동영상 1편; paper_pdf=논문·PDF·doi 등; institution·news=홈(/) 금지. 나무위키·DC 금지.",
      },
      sourceType: { type: "string", enum: [...SOURCE_TYPE_ENUM] },
      howItHelps: {
        type: "string",
        minLength: 40,
        maxLength: 700,
        description:
          "위 url 한 페이지가 탐구에 어떻게 쓰이는지: 왜 이 주소인지, 그 화면에서 무엇을 보면 좋은지(표 항목·기사 문단 등). ‘사이트에서 검색하세요’로 떠넘기지 말 것. 비공식이면 한계를 문단 안에 명시.",
      },
    },
    required: ["title", "url", "sourceType", "howItHelps"],
  };

  const researchExecutionAbstractionNote =
    "임의 인원·건수·기간·표본 수를 단정하지 말고 방법·절차·자료 유형을 일반적으로 서술.";

  const researchExecution =
    processKind === "data_ai"
      ? {
          type: "object" as const,
          additionalProperties: false as const,
          properties: {
            dataCollection: {
              type: "string",
              minLength: 12,
              maxLength: 700,
              description: `[4] 자료 확보: 설문·관찰 등과 공공데이터·KOSIS·기관 공개 자료 등을 주제에 맞게 한 문맥에 녹여 서술(라벨로 쪼개지 말 것). ${researchExecutionAbstractionNote}`,
            },
            analysisMethod: {
              type: "string",
              minLength: 12,
              maxLength: 700,
              description: `[4] 분석·통계·모델링의 종류와 논리. ${researchExecutionAbstractionNote}`,
            },
            tools: {
              type: "string",
              minLength: 8,
              maxLength: 350,
              description: `[4] 도구. Excel·시트·파이썬(Python)·AutoML 등. ${researchExecutionAbstractionNote}`,
            },
            visualization: {
              type: "string",
              minLength: 8,
              maxLength: 350,
              description: `[4] 시각화 유형·목적. ${researchExecutionAbstractionNote}`,
            },
          },
          required: ["dataCollection", "analysisMethod", "tools", "visualization"],
        }
      : {
          type: "object" as const,
          additionalProperties: false as const,
          properties: {
            dataCollection: {
              type: "string",
              minLength: 12,
              maxLength: 700,
              description:
                `[4] 자료·근거: 실험·관찰·설문·독서와 공공데이터·문헌·기관 자료 등을 자연스럽게 함께 서술. 수치 필수 아님. ${researchExecutionAbstractionNote}`,
            },
            analysisMethod: {
              type: "string",
              minLength: 12,
              maxLength: 700,
              description:
                `[4] 분석·비교 방법(개념 분석, 비교, 인용 등). ${researchExecutionAbstractionNote}`,
            },
            tools: {
              type: "string",
              minLength: 8,
              maxLength: 350,
              description:
                `[4] 도구: 한글·노션·캔바·실험기구·관찰일지 등. 코딩·AI는 주제에 필요할 때만. ${researchExecutionAbstractionNote}`,
            },
            visualization: {
              type: "string",
              minLength: 8,
              maxLength: 350,
              description:
                `[4] 정리·시각화 유형·목적. ${researchExecutionAbstractionNote}`,
            },
          },
          required: ["dataCollection", "analysisMethod", "tools", "visualization"],
        };

  const comparisonTable = {
    type: "object",
    additionalProperties: false,
    properties: {
      columnHeaders: {
        type: "array",
        minItems: 2,
        maxItems: 8,
        items: { type: "string", minLength: 1, maxLength: 80 },
        description:
          "열 제목. 첫 열은 보통 비교 항목·기준, 이후 열은 비교 대상(조건 A/B 등).",
      },
      rows: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            cells: {
              type: "array",
              minItems: 2,
              maxItems: 8,
              items: { type: "string", maxLength: 250 },
              description:
                "해당 행 칸 값. 개수는 columnHeaders와 동일. 데이터 칸에는 비교·대조할 내용의 요지(명사구·짧은 명사절). ~정리한다·~적는다·이 그룹에서~비율을 정리 등 절차 설명 금지. 열마다 대비가 드러나게.",
            },
          },
          required: ["cells"],
        },
        description:
          "데이터 행. 각 행의 cells 길이는 columnHeaders 길이와 같아야 함. ASCII/마크다운 표 문자열 금지.",
      },
    },
    required: ["columnHeaders", "rows"],
    description:
      "[5] 비교·대조표 초안. 구조화된 표만. 클라이언트가 HTML 테이블로 렌더링.",
  };

  const initialAnalysisPhaseEnum =
    processKind === "data_ai"
      ? [...DATA_AI_PHASE_ORDER]
      : [...GENERAL_PHASE_ORDER];

  const initialAnalysisExamplesDescription =
    processKind === "data_ai"
      ? "[6] 탐구 과정 단계별 실행 방안 — AI 업무 적용 프로세스 5단계. 순서·phase 고정. procedure·concreteOutput·caveat는 현재형."
      : "[6] 탐구 과정 단계별 실행 방안 — 과정중심 탐구 5단계. 순서·phase 고정. 현재형. 데이터·AI 모델 억지 금지.";

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      oneLineSummary: {
        type: "string",
        minLength: 10,
        maxLength: 400,
        description: "[1] 탐구 한 줄 요약",
      },
      keyTermsDefinition: {
        type: "string",
        minLength: 20,
        maxLength: 400,
        description:
          "[1] 핵심 용어 작업 정의·탐구 범위. 이온 결합 vs 이온머 등 혼동 방지.",
      },
      coreResearchQuestions: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string", minLength: 10, maxLength: 400 },
        description: "[2] 핵심 탐구 질문 3개",
      },
      analysisFrames: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string", minLength: 1, maxLength: 200 },
        description: "[3] 분석 프레임(관점 3가지)",
      },
      researchExecution,
      comparisonStructure: {
        type: "string",
        minLength: 20,
        maxLength: 800,
        description: "[5] 비교 구조 분석(서술: 무엇과 무엇을 어떤 기준으로 비교하는지).",
      },
      comparisonTable,
      initialAnalysisProcessKind: {
        type: "string",
        enum: [processKind],
        description:
          processKind === "data_ai"
            ? "데이터 분석형·AI 활용 탐구형. [6]은 AI 업무 적용 프로세스 5단계."
            : "실험·이론·PBL 등. [6]은 과정중심 탐구 5단계.",
      },
      initialAnalysisExamples: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        description: initialAnalysisExamplesDescription,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            phase: {
              type: "string",
              enum: initialAnalysisPhaseEnum,
              description: `인덱스 0~4와 순서 일치 (${initialAnalysisPhaseEnum.join(" → ")})`,
            },
            procedure: {
              type: "string",
              minLength: 20,
              maxLength: 360,
              description:
                "해당 단계에서 하는 일·상황. 학생 수준·탐구 맥락에 맞게 구체적으로.",
            },
            concreteOutput: {
              type: "string",
              minLength: 20,
              maxLength: 360,
              description:
                processKind === "data_ai"
                  ? "산출·수치·표·모델 출력·지표 등. 근거 없는 %·과장 금지."
                  : "산출·인용·비교 요지·초안 등. 근거 없는 단정 금지.",
            },
            caveat: {
              type: "string",
              minLength: 8,
              maxLength: 200,
              description: "한계·주의.",
            },
          },
          required: ["phase", "procedure", "concreteOutput", "caveat"],
        },
      },
      expectedResults: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: { type: "string", minLength: 8, maxLength: 200 },
        description: "[7] 기대 결과 — 짧은 항목 3~5개.",
      },
      extensionDirections: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: { type: "string", minLength: 8, maxLength: 200 },
        description: "[8] 확장 방향 — 짧은 항목 3~5개.",
      },
      subjects: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: { type: "string", enum: subjectEnum },
        description: "[9] 교과 연계",
      },
      recordSentence: {
        type: "string",
        minLength: 20,
        maxLength: 500,
        description: "[10] 세특·생기부 문장",
      },
      recommendedSources: {
        type: "array",
        minItems: RECOMMENDED_SOURCES_COUNT,
        maxItems: RECOMMENDED_SOURCES_COUNT,
        items: recommendedSource,
        description:
          `[11] 추천 참고 자료 정확히 ${RECOMMENDED_SOURCES_COUNT}개. 객체 필드 마지막에 둠. 모두 주제와 직결된 딥링크(기관·언론 홈 URL 금지). title·url(https)·sourceType·howItHelps. 유형 골고루(YouTube·논문/PDF·기관·기사).`,
      },
    },
    required: [
      "oneLineSummary",
      "keyTermsDefinition",
      "coreResearchQuestions",
      "analysisFrames",
      "researchExecution",
      "comparisonStructure",
      "comparisonTable",
      "initialAnalysisProcessKind",
      "initialAnalysisExamples",
      "expectedResults",
      "extensionDirections",
      "subjects",
      "recordSentence",
      "recommendedSources",
    ],
  };
}
