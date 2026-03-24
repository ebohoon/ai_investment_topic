import { z } from "zod";

export const recommendBodySchema = z.object({
  major: z.string().min(1, "희망 전공을 입력하세요.").max(200),
  keywords: z
    .array(z.string().min(1).max(80))
    .length(3, "관심 키워드는 정확히 3개여야 합니다."),
  grade: z.string().min(1, "학년을 선택하세요.").max(50),
  mbtiOrTrait: z.string().max(100).optional(),
  gradeLevel: z.string().max(100).optional(),
  performanceExperience: z.string().max(500).optional(),
});

export type RecommendBody = z.infer<typeof recommendBodySchema>;
