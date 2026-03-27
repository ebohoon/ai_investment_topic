/**
 * [7] 탐구 과정 단계별 실행 방안 — 탐구 유형(inquiryType)에 따른 프로필.
 * - data_ai: 데이터·AI 중심 → AI 업무 적용 프로세스 5단계
 * - general: 실험·이론·PBL 등 → 과정중심 탐구 5단계(수치·모델 강제 없음)
 */

export type InitialAnalysisProcessKind = "data_ai" | "general";

/** 데이터 분석형·AI 활용 탐구형 */
export function inferInitialAnalysisProcessKind(inquiryType: string): InitialAnalysisProcessKind {
  const t = inquiryType.trim();
  if (t === "데이터 분석형" || t === "AI 활용 탐구형") return "data_ai";
  return "general";
}

export const DATA_AI_PHASE_ORDER = [
  "문제 정의",
  "데이터 수집",
  "데이터 분석 및 전처리",
  "AI 모델링",
  "AI 적용",
] as const;

export const GENERAL_PHASE_ORDER = [
  "탐구 문제·목표 정리",
  "자료·근거 수집",
  "분석·해석",
  "종합·검토",
  "정리·성찰·발표",
] as const;
