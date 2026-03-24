export type RecommendPayload = {
  major: string;
  keywords: [string, string, string];
  grade: string;
  mbtiOrTrait?: string;
  gradeLevel?: string;
  performanceExperience?: string;
};

export type TopicCard = {
  title: string;
  subjects: string[];
  methods: string[];
  deliverables: string[];
  recordSentence: string;
};

export type RecommendApiResponse = {
  allowedSubjects: string[];
  topics: TopicCard[];
};

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(
  /\/$/,
  ""
) ?? "";

export async function fetchRecommendations(
  body: RecommendPayload
): Promise<RecommendApiResponse> {
  const res = await fetch(`${apiBase}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      major: body.major,
      keywords: body.keywords,
      grade: body.grade,
      mbtiOrTrait: body.mbtiOrTrait || undefined,
      gradeLevel: body.gradeLevel || undefined,
      performanceExperience: body.performanceExperience || undefined,
    }),
  });
  let data: { error?: string; topics?: TopicCard[]; allowedSubjects?: string[] };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error(`서버 응답을 해석할 수 없습니다 (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data.error ?? `요청 실패 (${res.status})`);
  }
  return data as RecommendApiResponse;
}
