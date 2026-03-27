import { z } from "zod";
import {
  DATA_AI_PHASE_ORDER,
  GENERAL_PHASE_ORDER,
} from "../lib/initialAnalysisProfile.js";
import {
  urlOutputPolicyViolationForRecommendedSource,
  urlOutputPolicyViolationForRelatedItem,
} from "../lib/urlPolicy.js";

export const topicItemSchema = z.object({
  title: z.string().min(5),
  subjects: z.array(z.string().min(1)).min(2).max(5),
  methods: z.array(z.string().min(3)).min(4).max(10),
  deliverables: z.array(z.string().min(2)).min(1).max(5),
  /** 핵심 탐구 질문(한 문장) */
  researchQuestion: z.string().min(8).max(300),
  /** 학생이 스스로 점검할 과정·근거 체크리스트 */
  processChecklist: z.array(z.string().min(3)).min(3).max(8),
  /** AI 활용·출처·개인정보 등 수행평가 맥락의 주의사항 */
  aiEthicsNote: z.string().min(30).max(800),
  recordSentence: z.string().min(20).max(600),
});

export const recommendResponseSchema = z.object({
  topics: z.array(topicItemSchema).min(3).max(5),
});

export type TopicItem = z.infer<typeof topicItemSchema>;
export type RecommendResponse = z.infer<typeof recommendResponseSchema>;

export const questionsResponseSchema = z.object({
  questions: z.array(z.string().min(10).max(400)).min(3).max(5),
});

export type QuestionsResponse = z.infer<typeof questionsResponseSchema>;

/** 추천 참고 자료 1건 — URL은 검증 가능한 실제 링크만 (가짜 링크 금지) */
export const recommendedSourceSchema = z
  .object({
    title: z.string().min(2).max(200),
    url: z.string().url().max(2000),
    sourceType: z.enum(["youtube", "paper_pdf", "institution", "news"]),
    /** 해당 주제에 어떤 점에서 도움이 되는지 논리적으로 한 덩어리로 서술 */
    howItHelps: z.string().min(80).max(1500),
  })
  .superRefine((val, ctx) => {
    const err = urlOutputPolicyViolationForRecommendedSource(val.url, val.sourceType);
    if (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err,
        path: ["url"],
      });
    }
  });

/** [12] 관련 검색 1건 — 제목에 [보고서]·[PDF] 등 유형 태그, 실제 URL */
export const relatedSearchItemSchema = z
  .object({
    title: z.string().min(8).max(220),
    url: z.string().url().max(2000),
    summary: z.string().min(15).max(500),
  })
  .superRefine((val, ctx) => {
    const err = urlOutputPolicyViolationForRelatedItem(val.title, val.url);
    if (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err,
        path: ["url"],
      });
    }
  });

/** [5] 탐구 방법 — 수집·분석·도구·시각화 */
export const researchExecutionSchema = z.object({
  dataCollection: z.string().min(20).max(1500),
  analysisMethod: z.string().min(20).max(1500),
  tools: z.string().min(10).max(800),
  visualization: z.string().min(10).max(800),
});

/** [6] 비교·대조표 — 열·행을 배열로만 전달(클라이언트가 HTML 테이블로 렌더) */
export const comparisonTableRowSchema = z.object({
  cells: z.array(z.string().max(2000)).min(2).max(8),
});

export const comparisonTableSchema = z
  .object({
    columnHeaders: z.array(z.string().min(1).max(80)).min(2).max(8),
    rows: z.array(comparisonTableRowSchema).min(2).max(15),
  })
  .superRefine((val, ctx) => {
    const n = val.columnHeaders.length;
    val.rows.forEach((row, i) => {
      if (row.cells.length !== n) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `rows[${i}].cells.length must equal columnHeaders.length (${n})`,
          path: ["rows", i, "cells"],
        });
      }
    });
  });

/** [7] 탐구 과정 단계별 실행 방안 — phase: data_ai 5단계 + general 5단계(문자열 겹침 없음) */
export const initialAnalysisPhaseSchema = z.enum([
  "문제 정의",
  "데이터 수집",
  "데이터 분석 및 전처리",
  "AI 모델링",
  "AI 적용",
  "탐구 문제·목표 정리",
  "자료·근거 수집",
  "분석·해석",
  "종합·검토",
  "정리·성찰·발표",
]);

export const initialAnalysisStepSchema = z.object({
  phase: initialAnalysisPhaseSchema,
  /** 주제에 맞는 가상 예시. 학생이 따라가기 쉽게 구체적으로 */
  procedure: z.string().min(35).max(800),
  /** 산출: 수치·표·논지·인용 등 */
  concreteOutput: z.string().min(35).max(800),
  /** 표본·인과·일반화·과적합 등 한계·주의 */
  caveat: z.string().min(12).max(400),
});

export const initialAnalysisExamplesSchema = z.array(initialAnalysisStepSchema).length(5);

export type InitialAnalysisStep = z.infer<typeof initialAnalysisStepSchema>;

/**
 * 실행 가능한 탐구 설계 (질문 기반 연구 안내).
 * [1]~[12] 구조 — 단순 주제 제안이 아님.
 */
export const explorationDesignSchema = z
  .object({
    /** [1] 탐구 한 줄 요약 */
    oneLineSummary: z.string().min(10).max(400),
    /** [1] 보조: 핵심 용어 작업 정의·탐구 범위(과학·사회 개념 혼동 방지) */
    keyTermsDefinition: z.string().min(30).max(800),
    /** [2] 핵심 탐구 질문 3개 */
    coreResearchQuestions: z.array(z.string().min(10).max(400)).length(3),
    /** [3] 추천 참고 자료 3~5개 (필수) */
    recommendedSources: z.array(recommendedSourceSchema).min(3).max(5),
    /** [4] 분석 프레임 (관점 3가지) */
    analysisFrames: z.array(z.string().min(1).max(200)).length(3),
    /** [5] 탐구 방법 — 수집·분석·도구·시각화 */
    researchExecution: researchExecutionSchema,
    /** [6] 비교 구조 분석(서술) */
    comparisonStructure: z.string().min(20).max(2000),
    /** [6] 보조: 비교·대조표 초안(구조화; ASCII·마크다운 문자열 금지) */
    comparisonTable: comparisonTableSchema,
    /** [7] 프로필: data_ai(데이터·AI) vs general(과정중심·비수치 가능) */
    initialAnalysisProcessKind: z.enum(["data_ai", "general"]),
    /** [7] 탐구 과정 단계별 실행 방안 — 프로필에 따른 5단계 */
    initialAnalysisExamples: initialAnalysisExamplesSchema,
    /** [8] 기대 결과 — 짧은 항목 3~6개(일목요연) */
    expectedResults: z.array(z.string().min(10).max(240)).min(3).max(6),
    /** [9] 확장 방향 — 짧은 항목 3~6개(일목요연) */
    extensionDirections: z.array(z.string().min(10).max(240)).min(3).max(6),
    /** [10] 교과 연계 (내부 풀 문자열) */
    subjects: z.array(z.string().min(1)).min(2).max(5),
    /** [11] 세특·생기부 문장 */
    recordSentence: z.string().min(20).max(800),
    /** [12] 관련 검색·참고 링크 — 정확히 10개 */
    relatedSearchItems: z.array(relatedSearchItemSchema).length(10),
  })
  .superRefine((data, ctx) => {
    const order =
      data.initialAnalysisProcessKind === "data_ai" ? DATA_AI_PHASE_ORDER : GENERAL_PHASE_ORDER;
    for (let i = 0; i < 5; i++) {
      const expected = order[i];
      if (data.initialAnalysisExamples[i]?.phase !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `initialAnalysisExamples[${i}].phase must be "${expected}" when initialAnalysisProcessKind is "${data.initialAnalysisProcessKind}"`,
          path: ["initialAnalysisExamples", i, "phase"],
        });
      }
    }
  });

export type ExplorationDesign = z.infer<typeof explorationDesignSchema>;
export type RecommendedSource = z.infer<typeof recommendedSourceSchema>;
export type RelatedSearchItem = z.infer<typeof relatedSearchItemSchema>;
export type ComparisonTable = z.infer<typeof comparisonTableSchema>;
