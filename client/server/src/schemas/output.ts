import { z } from "zod";

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
