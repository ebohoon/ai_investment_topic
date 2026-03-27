/**
 * OpenAI Chat Completions `response_format: json_schema` (strict) — 실행 가능한 탐구 설계.
 */

import type { InitialAnalysisProcessKind } from "../lib/initialAnalysisProfile.js";
import { DATA_AI_PHASE_ORDER, GENERAL_PHASE_ORDER } from "../lib/initialAnalysisProfile.js";

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
      title: { type: "string", minLength: 2, maxLength: 200 },
      url: {
        type: "string",
        minLength: 12,
        maxLength: 2000,
        description:
          "https만. youtube는 watch?v= 또는 youtu.be 동영상만; paper_pdf는 .pdf·arxiv·doi 등 문서 직접 링크만. institution·news는 공식 루트 가능. 나무위키·DC 금지.",
      },
      sourceType: { type: "string", enum: [...SOURCE_TYPE_ENUM] },
      howItHelps: {
        type: "string",
        minLength: 80,
        maxLength: 1500,
        description:
          "이 자료가 선택한 탐구 주제에 어떤 점에서 도움이 되는지, 왜 이 출처인지, 자료 안에서 무엇을 보면 좋은지까지 논리적으로 한 덩어리로 서술. 비공식 출처면 신뢰 한계를 문단 안에 명시.",
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
              minLength: 20,
              maxLength: 1500,
              description: `[5] 자료 확보: 설문·관찰 등과 공공데이터·KOSIS·기관 공개 자료 등을 주제에 맞게 한 문맥에 녹여 서술(라벨로 쪼개지 말 것). ${researchExecutionAbstractionNote}`,
            },
            analysisMethod: {
              type: "string",
              minLength: 20,
              maxLength: 1500,
              description: `[5] 분석·통계·모델링의 종류와 논리. ${researchExecutionAbstractionNote}`,
            },
            tools: {
              type: "string",
              minLength: 10,
              maxLength: 800,
              description: `[5] 도구. Excel·시트·파이썬(Python)·AutoML 등. ${researchExecutionAbstractionNote}`,
            },
            visualization: {
              type: "string",
              minLength: 10,
              maxLength: 800,
              description: `[5] 시각화 유형·목적. ${researchExecutionAbstractionNote}`,
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
              minLength: 20,
              maxLength: 1500,
              description:
                `[5] 자료·근거: 실험·관찰·설문·독서와 공공데이터·문헌·기관 자료 등을 자연스럽게 함께 서술. 수치 필수 아님. ${researchExecutionAbstractionNote}`,
            },
            analysisMethod: {
              type: "string",
              minLength: 20,
              maxLength: 1500,
              description:
                `[5] 분석·비교 방법(개념 분석, 비교, 인용 등). ${researchExecutionAbstractionNote}`,
            },
            tools: {
              type: "string",
              minLength: 10,
              maxLength: 800,
              description:
                `[5] 도구: 한글·노션·캔바·실험기구·관찰일지 등. 코딩·AI는 주제에 필요할 때만. ${researchExecutionAbstractionNote}`,
            },
            visualization: {
              type: "string",
              minLength: 10,
              maxLength: 800,
              description:
                `[5] 정리·시각화 유형·목적. ${researchExecutionAbstractionNote}`,
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
        maxItems: 15,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            cells: {
              type: "array",
              minItems: 2,
              maxItems: 8,
              items: { type: "string", maxLength: 2000 },
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
      "[6] 비교·대조표 초안. 구조화된 표만. 클라이언트가 HTML 테이블로 렌더링.",
  };

  const initialAnalysisPhaseEnum =
    processKind === "data_ai"
      ? [...DATA_AI_PHASE_ORDER]
      : [...GENERAL_PHASE_ORDER];

  const initialAnalysisExamplesDescription =
    processKind === "data_ai"
      ? "[7] 탐구 과정 단계별 실행 예시 — AI 업무 적용 프로세스 5단계. 순서 고정. ‘데이터 수집’ 단계는 설문·관찰과 공공데이터 등을 한 흐름으로 엮어 예시. [5]와 억지로 맞추지 않음."
      : "[7] 탐구 과정 단계별 실행 예시 — 과정중심 탐구 5단계. 순서 고정. ‘자료·근거 수집’ 단계는 직접 자료와 공공·기관 자료를 자연스럽게 함께 드러낼 것. 수치·AI 모델을 억지로 넣지 말 것.";

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
        minLength: 30,
        maxLength: 800,
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
      recommendedSources: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: recommendedSource,
        description:
          "[3] 추천 참고 자료. 접속 가능한 공식 https만. 불확실하면 루트 URL+howItHelps로 안내.",
      },
      analysisFrames: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string", minLength: 1, maxLength: 200 },
        description: "[4] 분석 프레임(관점 3가지)",
      },
      researchExecution,
      comparisonStructure: {
        type: "string",
        minLength: 20,
        maxLength: 2000,
        description: "[6] 비교 구조(서술: 무엇과 무엇을 어떤 기준으로 비교하는지).",
      },
      comparisonTable,
      initialAnalysisProcessKind: {
        type: "string",
        enum: [processKind],
        description:
          processKind === "data_ai"
            ? "탐구 유형이 데이터 분석형·AI 활용 탐구형일 때. [7] 탐구 과정 단계별 실행 예시는 AI 업무 적용 프로세스."
            : "실험형·이론 탐구형·문제 해결형(PBL) 등일 때. [7] 탐구 과정 단계별 실행 예시는 과정중심 5단계.",
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
              minLength: 35,
              maxLength: 800,
              description:
                "해당 단계에서 한 일(완료형). 학생 수준·탐구 맥락에 맞게 구체적으로.",
            },
            concreteOutput: {
              type: "string",
              minLength: 35,
              maxLength: 800,
              description:
                processKind === "data_ai"
                  ? "산출·수치·표·모델 출력·지표 등. 근거 없는 %·과장 금지."
                  : "산출·인용·비교 요지·초안 등. 근거 없는 단정 금지.",
            },
            caveat: {
              type: "string",
              minLength: 12,
              maxLength: 400,
              description: "한계·주의.",
            },
          },
          required: ["phase", "procedure", "concreteOutput", "caveat"],
        },
      },
      expectedResults: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: { type: "string", minLength: 10, maxLength: 240 },
        description: "[8] 기대 결과 — 짧은 항목 3~6개, 한 줄씩.",
      },
      extensionDirections: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: { type: "string", minLength: 10, maxLength: 240 },
        description: "[9] 확장 방향 — 짧은 항목 3~6개, 한 줄씩.",
      },
      subjects: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: { type: "string", enum: subjectEnum },
        description: "[10] 교과 연계",
      },
      recordSentence: {
        type: "string",
        minLength: 20,
        maxLength: 800,
        description: "[11] 세특·생기부 문장",
      },
      relatedSearchItems: {
        type: "array",
        minItems: 10,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: {
              type: "string",
              minLength: 8,
              maxLength: 220,
              description:
                "[유형] 접두 포함. 예: [보고서] ○○, [PDF] ○○, [기관] ○○, [YouTube] ○○",
            },
            url: {
              type: "string",
              minLength: 12,
              maxLength: 2000,
              description:
                "https만. [YouTube]는 동영상 딥링크만, [PDF]는 문서 딥링크만; [기관]·[뉴스]는 공식 루트 가능. 나무위키·DC 금지.",
            },
            summary: {
              type: "string",
              minLength: 15,
              maxLength: 500,
              description: "2~3문장. 이 링크가 탐구에 어떻게 도움이 되는지.",
            },
          },
          required: ["title", "url", "summary"],
        },
        description:
          "[12] 관련 자료 10건. 카드형(제목·URL·요약). [3]과 동일 URL 규칙. 유형 태그와 실제 https 필수.",
      },
    },
    required: [
      "oneLineSummary",
      "keyTermsDefinition",
      "coreResearchQuestions",
      "recommendedSources",
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
      "relatedSearchItems",
    ],
  };
}
