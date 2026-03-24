import { z } from "zod";

export const topicItemSchema = z.object({
  title: z.string().min(5),
  subjects: z.array(z.string().min(1)).min(2).max(5),
  methods: z.array(z.string().min(3)).min(4).max(10),
  deliverables: z.array(z.string().min(2)).min(1).max(5),
  recordSentence: z.string().min(20).max(600),
});

export const recommendResponseSchema = z.object({
  topics: z.array(topicItemSchema).min(3).max(5),
});

export type TopicItem = z.infer<typeof topicItemSchema>;
export type RecommendResponse = z.infer<typeof recommendResponseSchema>;
