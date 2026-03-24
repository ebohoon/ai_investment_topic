import { z } from "zod";

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
      .min(2, "관심 키워드는 각각 2글자 이상 입력해 주세요.")
      .max(80)
      .refine((s) => !isOnlyRepeatedChar(s), {
        message: "키워드에 같은 글자만 반복된 입력은 사용할 수 없습니다.",
      })
  );

export const recommendBodySchema = z
  .object({
    major: majorSchema,
    keywords: z
      .array(keywordSchema)
      .length(3, "관심 키워드는 정확히 3개여야 합니다."),
    grade: z.string().min(1, "학년을 선택하세요.").max(50),
    mbtiOrTrait: z.string().max(100).optional(),
    gradeLevel: z.string().max(100).optional(),
    performanceExperience: z.string().max(500).optional(),
  })
  .superRefine((d, ctx) => {
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
  });

export type RecommendBody = z.infer<typeof recommendBodySchema>;
