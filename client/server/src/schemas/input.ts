import { z } from "zod";
import { COURSE_CATEGORY_OPTIONS } from "../lib/curriculumCategories.js";
import { CURRICULUM_SUBJECT_UI } from "../lib/subjectRules.js";

/** 같은 문자만 2번 이상 반복 → "dd", "ㅋㅋ", "11" 등 */
function isOnlyRepeatedChar(s: string): boolean {
  return s.length >= 2 && /^(.)\1+$/.test(s);
}

const majorSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(2, "희망 전공은 2글자 이상 구체적으로 입력해 주세요.")
      .max(200, "희망 전공은 200자 이내로 입력해 주세요.")
      .refine((s) => !isOnlyRepeatedChar(s), {
        message: "희망 전공에 의미 없는 반복 입력은 사용할 수 없습니다.",
      })
  );

const keywordSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(1, "관심 키워드는 각각 1글자 이상 입력해 주세요.")
      .max(80)
      .refine((s) => !isOnlyRepeatedChar(s), {
        message: "키워드에 같은 글자만 반복된 입력은 사용할 수 없습니다.",
      })
  );

const inquiryStyleSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z
    .enum([
      "실험·관찰",
      "설문·인터뷰",
      "데이터·코딩·분석",
      "독서·에세이·발표",
      "사회이슈·정책 조사",
      "상관없음",
    ])
    .optional()
);

/** 프론트 드롭다운과 동일하게 유지 */
export const CONSTRAINT_PERIOD_OPTIONS = [
  "1주 이내",
  "2~4주",
  "한 학기 정도",
  "일정 미정·여유 있음",
] as const;

export const CONSTRAINT_PLACE_OPTIONS = [
  "집·온라인 위주",
  "학교 교실",
  "실험실·준비된 장소 가능",
  "도서관·독서실 등",
  "야외·지역사회",
] as const;

export const CONSTRAINT_TEAM_OPTIONS = [
  "혼자",
  "2~3명",
  "모둠(4명 이상)",
  "교사와 사전 협의 필요",
] as const;

export const CONSTRAINT_BUDGET_OPTIONS = [
  "추가 비용 없이",
  "집·학교 재료로 가능",
  "소액(만 원 안팎)까지 가능",
  "비용·재료 제약 없음",
  "잘 모르겠음",
] as const;

const constraintPeriodSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.enum(CONSTRAINT_PERIOD_OPTIONS).optional()
);

const constraintPlaceSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.enum(CONSTRAINT_PLACE_OPTIONS).optional()
);

const constraintTeamSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.enum(CONSTRAINT_TEAM_OPTIONS).optional()
);

const constraintBudgetSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.enum(CONSTRAINT_BUDGET_OPTIONS).optional()
);

/** 탐구 설계 플로우: 내신 수준(필수) — 프론트 GRADE_LEVEL_OPTIONS 값과 동일 */
export const GRADE_LEVEL_UI_OPTIONS = [
  "상위권",
  "중상위권",
  "중위권",
  "중하위권",
  "하위권",
  "비공개",
] as const;

const gradeLevelStrictSchema = z.enum(GRADE_LEVEL_UI_OPTIONS, {
  errorMap: () => ({ message: "내신 수준을 선택하세요." }),
});

const mbtiOrTraitStrictSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(2, "성향/MBTI를 선택하거나 2글자 이상 입력해 주세요.")
      .max(100)
      .refine((s) => !isOnlyRepeatedChar(s), {
        message: "성향/MBTI에 의미 없는 반복 입력은 사용할 수 없습니다.",
      })
  );

const performanceExperienceStrictSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(5, "수행·탐구 경험을 5글자 이상 입력해 주세요.")
      .max(500)
      .refine((s) => !isOnlyRepeatedChar(s), {
        message: "수행·탐구 경험에 의미 없는 반복 입력은 사용할 수 없습니다.",
      })
  );

const inquiryStyleStrictSchema = z.enum(
  [
    "실험·관찰",
    "설문·인터뷰",
    "데이터·코딩·분석",
    "독서·에세이·발표",
    "사회이슈·정책 조사",
    "상관없음",
  ],
  { errorMap: () => ({ message: "희망 탐구 방식을 선택하세요." }) }
);

const constraintPeriodStrictSchema = z.enum(CONSTRAINT_PERIOD_OPTIONS, {
  errorMap: () => ({ message: "기간을 선택하세요." }),
});
const constraintPlaceStrictSchema = z.enum(CONSTRAINT_PLACE_OPTIONS, {
  errorMap: () => ({ message: "장소·환경을 선택하세요." }),
});
const constraintTeamStrictSchema = z.enum(CONSTRAINT_TEAM_OPTIONS, {
  errorMap: () => ({ message: "진행 방식을 선택하세요." }),
});
const constraintBudgetStrictSchema = z.enum(CONSTRAINT_BUDGET_OPTIONS, {
  errorMap: () => ({ message: "비용·재료를 선택하세요." }),
});

const constraintsExtraOptionalSchema = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const t = String(v).trim();
    return t.length === 0 ? undefined : t;
  },
  z.string().max(120).optional()
);

function refineExplorationConstraintsExtraOnly(
  d: { constraintsExtra?: string },
  ctx: z.RefinementCtx
) {
  if (d.constraintsExtra === undefined) return;
  const t = d.constraintsExtra.trim();
  if (t.length > 0 && t.length < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "기타 조건은 비워 두거나, 5글자 이상 구체적으로 입력해 주세요.",
      path: ["constraintsExtra"],
    });
  } else if (t.length >= 2 && isOnlyRepeatedChar(t)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "기타 조건에 의미 없는 반복 입력은 사용할 수 없습니다.",
      path: ["constraintsExtra"],
    });
  }
}

/** 프론트 학년 선택과 동일하게 유지 */
export const GRADE_OPTIONS = ["중1", "중2", "중3", "고1", "고2", "고3"] as const;

const gradeSchema = z.enum(GRADE_OPTIONS, {
  errorMap: () => ({ message: "학년을 목록에서 선택하세요." }),
});

/** /api/recommend/questions, /api/recommend/design 공통 본문(필수 필드 강화) */
export const explorationRecommendCoreObjectSchema = z.object({
  major: majorSchema,
  keywords: z
    .array(keywordSchema)
    .length(3, "관심 키워드는 정확히 3개여야 합니다."),
  grade: gradeSchema,
  mbtiOrTrait: mbtiOrTraitStrictSchema,
  gradeLevel: gradeLevelStrictSchema,
  performanceExperience: performanceExperienceStrictSchema,
  inquiryStyle: inquiryStyleStrictSchema,
  constraintPeriod: constraintPeriodStrictSchema,
  constraintPlace: constraintPlaceStrictSchema,
  constraintTeam: constraintTeamStrictSchema,
  constraintBudget: constraintBudgetStrictSchema,
  constraintsExtra: constraintsExtraOptionalSchema,
});

const recommendCoreObjectSchema = z.object({
  major: majorSchema,
  keywords: z
    .array(keywordSchema)
    .length(3, "관심 키워드는 정확히 3개여야 합니다."),
  grade: gradeSchema,
  mbtiOrTrait: z.string().max(100).optional(),
  gradeLevel: z.string().max(100).optional(),
  performanceExperience: z.string().max(500).optional(),
  inquiryStyle: inquiryStyleSchema,
  constraintPeriod: constraintPeriodSchema,
  constraintPlace: constraintPlaceSchema,
  constraintTeam: constraintTeamSchema,
  constraintBudget: constraintBudgetSchema,
  constraintsExtra: z.string().max(120).optional(),
});

function refineRecommendFields(
  d: z.infer<typeof recommendCoreObjectSchema>,
  ctx: z.RefinementCtx
) {
    const checkOptionalShort = (
      val: string | undefined,
      path: string,
      label: string
    ) => {
      if (val === undefined) return;
      const t = val.trim();
      if (t.length === 0) return;
      if (t.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}은(는) 비워 두거나 2글자 이상 입력해 주세요.`,
          path: [path],
        });
        return;
      }
      if (isOnlyRepeatedChar(t)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}에 의미 없는 반복 입력은 사용할 수 없습니다.`,
          path: [path],
        });
      }
    };

    checkOptionalShort(d.mbtiOrTrait, "mbtiOrTrait", "성향/MBTI");
    checkOptionalShort(d.gradeLevel, "gradeLevel", "내신 수준");

    if (d.performanceExperience !== undefined) {
      const t = d.performanceExperience.trim();
      if (t.length > 0 && t.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "수행·탐구 경험은 비워 두거나, 5글자 이상 구체적으로 입력해 주세요.",
          path: ["performanceExperience"],
        });
      } else if (t.length >= 2 && isOnlyRepeatedChar(t)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "수행·탐구 경험에 의미 없는 반복 입력은 사용할 수 없습니다.",
          path: ["performanceExperience"],
        });
      }
    }

    if (d.constraintsExtra !== undefined) {
      const t = d.constraintsExtra.trim();
      if (t.length > 0 && t.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "기타 조건은 비워 두거나, 5글자 이상 구체적으로 입력해 주세요.",
          path: ["constraintsExtra"],
        });
      } else if (t.length >= 2 && isOnlyRepeatedChar(t)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "기타 조건에 의미 없는 반복 입력은 사용할 수 없습니다.",
          path: ["constraintsExtra"],
        });
      }
    }
}

export const recommendBodySchema =
  recommendCoreObjectSchema.superRefine(refineRecommendFields);

export type RecommendBody = z.infer<typeof recommendBodySchema>;

export const INQUIRY_TYPE_OPTIONS = [
  "데이터 분석형",
  "실험형",
  "이론 탐구형",
  "문제 해결형(PBL)",
  "AI 활용 탐구형",
] as const;

export const GOAL_LEVEL_OPTIONS = [
  "수행평가용 (간단)",
  "세특 기록용 (중간)",
  "심화 탐구/생기부 메인 (고난도)",
] as const;

export const OUTPUT_FORMAT_OPTIONS = [
  "보고서",
  "발표(PPT)",
  "논문형",
  "데이터 분석 결과",
  "AI 모델 결과",
] as const;

export const AI_USAGE_LEVEL_OPTIONS = [
  "사용 안함",
  "보조적으로 활용",
  "AI 중심 탐구",
] as const;

const courseCategorySchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.enum(COURSE_CATEGORY_OPTIONS).optional()
);

const courseNameSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : String(v).trim()),
  z.string().max(100).optional()
);

function refineExplorationCurriculum(
  d: {
    selectedSubject: (typeof CURRICULUM_SUBJECT_UI)[number];
    courseCategory?: string;
    courseName?: string;
  },
  ctx: z.RefinementCtx
) {
  if (d.selectedSubject === "기타") {
    const n = d.courseName?.trim() ?? "";
    if (n.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "기타 선택 시 세부 교과·과목명을 2글자 이상 입력해 주세요.",
        path: ["courseName"],
      });
    } else if (isOnlyRepeatedChar(n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "세부 교과명에 의미 없는 반복 입력은 사용할 수 없습니다.",
        path: ["courseName"],
      });
    }
  } else {
    if (!d.courseCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "과목 분류(공통·일반·진로·융합)를 선택하세요.",
        path: ["courseCategory"],
      });
    }
    const cn = d.courseName?.trim() ?? "";
    if (!cn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "교과 과목명을 선택하세요.",
        path: ["courseName"],
      });
    } else if (isOnlyRepeatedChar(cn)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "과목명에 의미 없는 반복 입력은 사용할 수 없습니다.",
        path: ["courseName"],
      });
    }
  }
}

const explorationExtraObjectSchema = z.object({
  selectedSubject: z.enum(CURRICULUM_SUBJECT_UI, {
    errorMap: () => ({ message: "교과를 목록에서 선택하세요." }),
  }),
  courseCategory: courseCategorySchema,
  courseName: courseNameSchema,
  inquiryType: z.enum(INQUIRY_TYPE_OPTIONS, {
    errorMap: () => ({ message: "탐구 유형을 선택하세요." }),
  }),
  goalLevel: z.enum(GOAL_LEVEL_OPTIONS, {
    errorMap: () => ({ message: "탐구 목표 수준을 선택하세요." }),
  }),
  outputFormat: z.enum(OUTPUT_FORMAT_OPTIONS, {
    errorMap: () => ({ message: "결과 형태를 선택하세요." }),
  }),
  aiUsageLevel: z.enum(AI_USAGE_LEVEL_OPTIONS, {
    errorMap: () => ({ message: "AI 활용 수준을 선택하세요." }),
  }),
});

export const explorationBodySchema = explorationRecommendCoreObjectSchema
  .merge(explorationExtraObjectSchema)
  .superRefine(refineExplorationConstraintsExtraOnly)
  .superRefine(refineExplorationCurriculum);

export type ExplorationBody = z.infer<typeof explorationBodySchema>;

const singleQuestionSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(10, "선택한 탐구 질문이 너무 짧습니다.")
      .max(500, "탐구 질문은 500자 이내여야 합니다.")
  );

export const designBodySchema = explorationRecommendCoreObjectSchema
  .merge(explorationExtraObjectSchema)
  .merge(
    z.object({
      selectedQuestions: z
        .array(singleQuestionSchema)
        .min(1, "탐구 질문을 1개 이상 선택하세요.")
        .max(5, "탐구 질문은 최대 5개까지 선택할 수 있습니다."),
    })
  )
  .superRefine(refineExplorationConstraintsExtraOnly)
  .superRefine(refineExplorationCurriculum);

export type DesignBody = z.infer<typeof designBodySchema>;
