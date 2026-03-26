/** 서버 input.ts 규칙과 동일하게 유지 (제출 전 안내용) */

import {
  COURSE_CATEGORY_OPTIONS,
  isMiddleSchoolGrade,
  isValidMiddleSchoolCourse,
  MIDDLE_SUBJECT_GROUP_KEYS,
  SUBJECT_GROUP_KEYS,
} from "./curriculumData";

function isOnlyRepeatedChar(s: string): boolean {
  return s.length >= 2 && /^(.)\1+$/.test(s);
}

/** 고등학교 STEP1 교과(군) 목록 — 탐구 전체 검증은 `subjectsForExplorationGrade` 사용 */
export const CURRICULUM_SUBJECTS = SUBJECT_GROUP_KEYS;

export function subjectsForExplorationGrade(grade: string): readonly string[] {
  return isMiddleSchoolGrade(grade) ? MIDDLE_SUBJECT_GROUP_KEYS : SUBJECT_GROUP_KEYS;
}

export { COURSE_CATEGORY_OPTIONS };

export const INQUIRY_TYPES = [
  "데이터 분석형",
  "실험형",
  "이론 탐구형",
  "문제 해결형(PBL)",
  "AI 활용 탐구형",
] as const;

export const GOAL_LEVELS = [
  "수행평가용 (간단)",
  "세특 기록용 (중간)",
  "심화 탐구/생기부 메인 (고난도)",
] as const;

export const OUTPUT_FORMATS = [
  "보고서",
  "발표(PPT)",
  "논문형",
  "데이터 분석 결과",
  "AI 모델 결과",
] as const;

export const AI_USAGE_LEVELS = [
  "사용 안함",
  "보조적으로 활용",
  "AI 중심 탐구",
] as const;

/** 서버 GRADE_LEVEL_UI_OPTIONS와 동일 */
export const GRADE_LEVEL_REQUIRED = [
  "상위권",
  "중상위권",
  "중위권",
  "중하위권",
  "하위권",
  "비공개",
] as const;

export const INQUIRY_STYLE_VALUES = [
  "실험·관찰",
  "설문·인터뷰",
  "데이터·코딩·분석",
  "독서·에세이·발표",
  "사회이슈·정책 조사",
  "상관없음",
] as const;

export const CONSTRAINT_PERIOD_VALUES = [
  "1주 이내",
  "2~4주",
  "한 학기 정도",
  "일정 미정·여유 있음",
] as const;

export const CONSTRAINT_PLACE_VALUES = [
  "집·온라인 위주",
  "학교 교실",
  "실험실·준비된 장소 가능",
  "도서관·독서실 등",
  "야외·지역사회",
] as const;

export const CONSTRAINT_TEAM_VALUES = [
  "혼자",
  "2~3명",
  "모둠(4명 이상)",
  "교사와 사전 협의 필요",
] as const;

export const CONSTRAINT_BUDGET_VALUES = [
  "추가 비용 없이",
  "집·학교 재료로 가능",
  "소액(만 원 안팎)까지 가능",
  "비용·재료 제약 없음",
  "잘 모르겠음",
] as const;

export type RecommendFormInput = {
  major: string;
  keywords: [string, string, string];
  mbtiOrTrait: string;
  gradeLevel: string;
  performanceExperience: string;
  constraintsExtra: string;
  /** STEP 2 선택 — 키워드보다 긴 관심 주제 설명 */
  interestTopicDetail: string;
};

/** 오류 메시지 또는 null(통과) */
export function validateRecommendForm(input: RecommendFormInput): string | null {
  const major = input.major.trim();
  if (major.length < 2) {
    return "희망 전공은 2글자 이상 구체적으로 입력해 주세요.";
  }
  if (isOnlyRepeatedChar(major)) {
    return "희망 전공에 의미 없는 반복 입력은 사용할 수 없습니다.";
  }

  for (let i = 0; i < 3; i++) {
    const k = input.keywords[i].trim();
    if (!k) {
      return "관심 키워드를 세 칸 모두 입력하세요.";
    }
    if (isOnlyRepeatedChar(k)) {
      return "키워드에 같은 글자만 반복된 입력은 사용할 수 없습니다.";
    }
  }

  const mbti = input.mbtiOrTrait.trim();
  if (mbti.length < 2) {
    return "성향/MBTI를 선택하거나 2글자 이상 입력해 주세요.";
  }
  if (isOnlyRepeatedChar(mbti)) {
    return "성향/MBTI에 의미 없는 반복 입력은 사용할 수 없습니다.";
  }

  const gl = input.gradeLevel.trim();
  if (!gl || !GRADE_LEVEL_REQUIRED.includes(gl as (typeof GRADE_LEVEL_REQUIRED)[number])) {
    return "내신 수준을 선택하세요.";
  }

  const perf = input.performanceExperience.trim();
  if (perf.length > 0 && perf.length < 5) {
    return "수행·탐구 경험은 비워 두거나, 5글자 이상 구체적으로 입력해 주세요.";
  }
  if (perf.length >= 2 && isOnlyRepeatedChar(perf)) {
    return "수행·탐구 경험에 의미 없는 반복 입력은 사용할 수 없습니다.";
  }

  const extra = input.constraintsExtra.trim();
  if (extra.length > 0 && extra.length < 5) {
    return "기타 조건은 비워 두거나, 5글자 이상 구체적으로 입력해 주세요.";
  }
  if (extra.length >= 2 && isOnlyRepeatedChar(extra)) {
    return "기타 조건에 의미 없는 반복 입력은 사용할 수 없습니다.";
  }

  const topicDetail = input.interestTopicDetail.trim();
  if (topicDetail.length > 0 && topicDetail.length < 5) {
    return "관심 주제 상세는 비워 두거나, 5글자 이상 구체적으로 입력해 주세요.";
  }
  if (topicDetail.length >= 2 && isOnlyRepeatedChar(topicDetail)) {
    return "관심 주제 상세에 의미 없는 반복 입력은 사용할 수 없습니다.";
  }

  return null;
}

function validateExplorationConditionFields(input: {
  inquiryStyle: string;
  constraintPeriod: string;
  constraintPlace: string;
  constraintTeam: string;
  constraintBudget: string;
}): string | null {
  const st = input.inquiryStyle.trim();
  if (!st || !INQUIRY_STYLE_VALUES.includes(st as (typeof INQUIRY_STYLE_VALUES)[number])) {
    return "희망 탐구 방식을 선택하세요.";
  }
  const p = input.constraintPeriod.trim();
  if (!p || !CONSTRAINT_PERIOD_VALUES.includes(p as (typeof CONSTRAINT_PERIOD_VALUES)[number])) {
    return "기간을 선택하세요.";
  }
  const pl = input.constraintPlace.trim();
  if (!pl || !CONSTRAINT_PLACE_VALUES.includes(pl as (typeof CONSTRAINT_PLACE_VALUES)[number])) {
    return "장소·환경을 선택하세요.";
  }
  const tm = input.constraintTeam.trim();
  if (!tm || !CONSTRAINT_TEAM_VALUES.includes(tm as (typeof CONSTRAINT_TEAM_VALUES)[number])) {
    return "진행 방식을 선택하세요.";
  }
  const bd = input.constraintBudget.trim();
  if (!bd || !CONSTRAINT_BUDGET_VALUES.includes(bd as (typeof CONSTRAINT_BUDGET_VALUES)[number])) {
    return "비용·재료를 선택하세요.";
  }
  return null;
}

export type ExplorationFormInput = RecommendFormInput & {
  grade: string;
  selectedSubject: string;
  courseCategory: string;
  courseName: string;
  inquiryType: string;
  goalLevel: string;
  outputFormat: string;
  aiUsageLevel: string;
  inquiryStyle: string;
  constraintPeriod: string;
  constraintPlace: string;
  constraintTeam: string;
  constraintBudget: string;
};

/** 질문·설계 API 호출 전 전체 검증 */
export function validateExplorationForm(input: ExplorationFormInput): string | null {
  const base = validateRecommendForm(input);
  if (base) return base;
  const cond = validateExplorationConditionFields(input);
  if (cond) return cond;

  if (!input.selectedSubject.trim()) {
    return "교과를 선택하세요.";
  }
  const allowedSubjects = subjectsForExplorationGrade(input.grade);
  if (!allowedSubjects.includes(input.selectedSubject)) {
    return "교과를 목록에서 선택하세요.";
  }

  if (!isMiddleSchoolGrade(input.grade)) {
    if (["체육", "예술", "기술·가정"].includes(input.selectedSubject)) {
      return "체육·예술·기술·가정은 중학교 학년에서만 선택할 수 있습니다.";
    }
  }

  if (input.selectedSubject === "기타") {
    const n = input.courseName.trim();
    if (n.length < 2) {
      return "기타 선택 시 세부 교과·과목명을 2글자 이상 입력해 주세요.";
    }
    if (isOnlyRepeatedChar(n)) {
      return "세부 교과명에 의미 없는 반복 입력은 사용할 수 없습니다.";
    }
  } else if (isMiddleSchoolGrade(input.grade)) {
    const cn = input.courseName.trim();
    if (!cn) {
      return "교과 과목명을 선택하세요.";
    }
    if (isOnlyRepeatedChar(cn)) {
      return "과목명에 의미 없는 반복 입력은 사용할 수 없습니다.";
    }
    if (!isValidMiddleSchoolCourse(input.selectedSubject, cn)) {
      return "선택한 교과(군)에 맞는 과목명을 고르세요.";
    }
  } else {
    if (!input.courseCategory.trim()) {
      return "과목 분류(공통·일반·진로·융합)를 선택하세요.";
    }
    if (!COURSE_CATEGORY_OPTIONS.includes(input.courseCategory as (typeof COURSE_CATEGORY_OPTIONS)[number])) {
      return "과목 분류를 목록에서 선택하세요.";
    }
    const cn = input.courseName.trim();
    if (!cn) {
      return "교과 과목명을 선택하세요.";
    }
    if (isOnlyRepeatedChar(cn)) {
      return "과목명에 의미 없는 반복 입력은 사용할 수 없습니다.";
    }
  }

  if (!input.inquiryType.trim()) {
    return "탐구 유형을 선택하세요.";
  }
  if (!INQUIRY_TYPES.includes(input.inquiryType as (typeof INQUIRY_TYPES)[number])) {
    return "탐구 유형을 목록에서 선택하세요.";
  }

  if (!input.goalLevel.trim()) {
    return "탐구 목표 수준을 선택하세요.";
  }
  if (!GOAL_LEVELS.includes(input.goalLevel as (typeof GOAL_LEVELS)[number])) {
    return "탐구 목표 수준을 목록에서 선택하세요.";
  }

  if (!input.outputFormat.trim()) {
    return "결과 형태를 선택하세요.";
  }
  if (!OUTPUT_FORMATS.includes(input.outputFormat as (typeof OUTPUT_FORMATS)[number])) {
    return "결과 형태를 목록에서 선택하세요.";
  }

  if (!input.aiUsageLevel.trim()) {
    return "AI 활용 수준을 선택하세요.";
  }
  if (!AI_USAGE_LEVELS.includes(input.aiUsageLevel as (typeof AI_USAGE_LEVELS)[number])) {
    return "AI 활용 수준을 목록에서 선택하세요.";
  }

  return null;
}

export function validateExplorationStep1(input: {
  selectedSubject: string;
  courseCategory: string;
  courseName: string;
  major: string;
  grade: string;
}): string | null {
  const major = input.major.trim();
  if (major.length < 2) return "희망 전공은 2글자 이상 구체적으로 입력해 주세요.";
  if (isOnlyRepeatedChar(major)) {
    return "희망 전공에 의미 없는 반복 입력은 사용할 수 없습니다.";
  }
  if (!input.grade.trim()) return "학년을 선택하세요.";

  if (!input.selectedSubject.trim()) return "교과를 선택하세요.";
  const allowedSubjects = subjectsForExplorationGrade(input.grade);
  if (!allowedSubjects.includes(input.selectedSubject)) {
    return "교과를 목록에서 선택하세요.";
  }
  if (!isMiddleSchoolGrade(input.grade)) {
    if (["체육", "예술", "기술·가정"].includes(input.selectedSubject)) {
      return "체육·예술·기술·가정은 중학교 학년에서만 선택할 수 있습니다.";
    }
  }

  if (input.selectedSubject === "기타") {
    const n = input.courseName.trim();
    if (n.length < 2) return "기타 선택 시 세부 교과·과목명을 2글자 이상 입력해 주세요.";
    if (isOnlyRepeatedChar(n)) {
      return "세부 교과명에 의미 없는 반복 입력은 사용할 수 없습니다.";
    }
  } else if (isMiddleSchoolGrade(input.grade)) {
    const cn = input.courseName.trim();
    if (!cn) return "교과 과목명을 선택하세요.";
    if (isOnlyRepeatedChar(cn)) {
      return "과목명에 의미 없는 반복 입력은 사용할 수 없습니다.";
    }
    if (!isValidMiddleSchoolCourse(input.selectedSubject, cn)) {
      return "선택한 교과(군)에 맞는 과목명을 고르세요.";
    }
  } else {
    if (!input.courseCategory.trim()) return "과목 분류를 선택하세요.";
    if (!COURSE_CATEGORY_OPTIONS.includes(input.courseCategory as (typeof COURSE_CATEGORY_OPTIONS)[number])) {
      return "과목 분류를 목록에서 선택하세요.";
    }
    if (!input.courseName.trim()) return "교과 과목명을 선택하세요.";
    if (isOnlyRepeatedChar(input.courseName.trim())) {
      return "과목명에 의미 없는 반복 입력은 사용할 수 없습니다.";
    }
  }
  return null;
}

export function validateExplorationStep2(input: RecommendFormInput): string | null {
  return validateRecommendForm(input);
}

export function validateExplorationStep2Full(
  input: RecommendFormInput & {
    goalLevel: string;
    outputFormat: string;
    aiUsageLevel: string;
    inquiryStyle: string;
    constraintPeriod: string;
    constraintPlace: string;
    constraintTeam: string;
    constraintBudget: string;
  }
): string | null {
  const base = validateRecommendForm(input);
  if (base) return base;
  const cond = validateExplorationConditionFields(input);
  if (cond) return cond;
  if (!input.goalLevel.trim()) return "탐구 목표 수준을 선택하세요.";
  if (!GOAL_LEVELS.includes(input.goalLevel as (typeof GOAL_LEVELS)[number])) {
    return "탐구 목표 수준을 목록에서 선택하세요.";
  }
  if (!input.outputFormat.trim()) return "결과 형태를 선택하세요.";
  if (!OUTPUT_FORMATS.includes(input.outputFormat as (typeof OUTPUT_FORMATS)[number])) {
    return "결과 형태를 목록에서 선택하세요.";
  }
  if (!input.aiUsageLevel.trim()) return "AI 활용 수준을 선택하세요.";
  if (!AI_USAGE_LEVELS.includes(input.aiUsageLevel as (typeof AI_USAGE_LEVELS)[number])) {
    return "AI 활용 수준을 목록에서 선택하세요.";
  }
  return null;
}

export function validateExplorationStep3(inquiryType: string): string | null {
  if (!inquiryType.trim()) return "탐구 유형을 선택하세요.";
  if (!INQUIRY_TYPES.includes(inquiryType as (typeof INQUIRY_TYPES)[number])) {
    return "탐구 유형을 목록에서 선택하세요.";
  }
  return null;
}
