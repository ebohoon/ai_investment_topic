export type RecommendPayload = {
  major: string;
  keywords: [string, string, string];
  grade: string;
  mbtiOrTrait?: string;
  gradeLevel?: string;
  performanceExperience?: string;
  inquiryStyle?: string;
  constraintPeriod?: string;
  constraintPlace?: string;
  constraintTeam?: string;
  constraintBudget?: string;
  constraintsExtra?: string;
};

/** POST /api/recommend/questions · /api/recommend/design 공통 본문 */
export type ExplorationPayload = RecommendPayload & {
  selectedSubject: string;
  courseCategory?: string;
  courseName?: string;
  inquiryType: string;
  goalLevel: string;
  outputFormat: string;
  aiUsageLevel: string;
};

export type TopicCard = {
  title: string;
  subjects: string[];
  methods: string[];
  deliverables: string[];
  researchQuestion: string;
  processChecklist: string[];
  aiEthicsNote: string;
  recordSentence: string;
};

export type RecommendApiResponse = {
  allowedSubjects: string[];
  topics: TopicCard[];
};

export type ExplorationDesign = {
  title: string;
  researchQuestion: string;
  overview: string;
  methodSteps: string[];
  expectedResults: string;
  extensionDirections: string;
  subjects: string[];
  recordSentence: string;
  aiEthicsNote: string;
  processChecklist: string[];
};

export type QuestionsApiResponse = {
  allowedSubjects: string[];
  questions: string[];
};

export type DesignApiResponse = {
  allowedSubjects: string[];
  /** 선택한 탐구 질문 순서와 동일한 길이의 설계 배열 */
  designs: ExplorationDesign[];
};

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(
  /\/$/,
  ""
) ?? "";

function explorationJsonBody(body: ExplorationPayload) {
  return {
    major: body.major,
    keywords: body.keywords,
    grade: body.grade,
    mbtiOrTrait: body.mbtiOrTrait || undefined,
    gradeLevel: body.gradeLevel || undefined,
    performanceExperience: body.performanceExperience || undefined,
    inquiryStyle: body.inquiryStyle || undefined,
    constraintPeriod: body.constraintPeriod || undefined,
    constraintPlace: body.constraintPlace || undefined,
    constraintTeam: body.constraintTeam || undefined,
    constraintBudget: body.constraintBudget || undefined,
    constraintsExtra: body.constraintsExtra?.trim() || undefined,
    selectedSubject: body.selectedSubject,
    courseCategory: body.courseCategory?.trim() || undefined,
    courseName: body.courseName?.trim() || undefined,
    inquiryType: body.inquiryType,
    goalLevel: body.goalLevel,
    outputFormat: body.outputFormat,
    aiUsageLevel: body.aiUsageLevel,
  };
}

export async function fetchRecommendations(
  body: RecommendPayload
): Promise<RecommendApiResponse> {
  let res: Response;
  try {
    res = await fetch(`${apiBase}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        major: body.major,
        keywords: body.keywords,
        grade: body.grade,
        mbtiOrTrait: body.mbtiOrTrait || undefined,
        gradeLevel: body.gradeLevel || undefined,
        performanceExperience: body.performanceExperience || undefined,
        inquiryStyle: body.inquiryStyle || undefined,
        constraintPeriod: body.constraintPeriod || undefined,
        constraintPlace: body.constraintPlace || undefined,
        constraintTeam: body.constraintTeam || undefined,
        constraintBudget: body.constraintBudget || undefined,
        constraintsExtra: body.constraintsExtra?.trim() || undefined,
      }),
    });
  } catch {
    throw new Error(
      "서버에 연결할 수 없습니다. 로컬에서는 API 서버(npm run dev -w aicc-server)가 실행 중인지 확인해 주세요."
    );
  }
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

export async function fetchResearchQuestions(
  body: ExplorationPayload
): Promise<QuestionsApiResponse> {
  let res: Response;
  try {
    res = await fetch(`${apiBase}/api/recommend/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(explorationJsonBody(body)),
    });
  } catch {
    throw new Error(
      "서버에 연결할 수 없습니다. 로컬에서는 API 서버가 실행 중인지 확인해 주세요."
    );
  }
  let data: { error?: string; questions?: string[]; allowedSubjects?: string[] };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error(`서버 응답을 해석할 수 없습니다 (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data.error ?? `요청 실패 (${res.status})`);
  }
  return data as QuestionsApiResponse;
}

export async function fetchExplorationDesign(
  body: ExplorationPayload & { selectedQuestions: string[] }
): Promise<DesignApiResponse> {
  const selectedQuestions = body.selectedQuestions
    .map((q) => q.trim())
    .filter((q) => q.length > 0);
  let res: Response;
  try {
    res = await fetch(`${apiBase}/api/recommend/design`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...explorationJsonBody(body),
        selectedQuestions,
      }),
    });
  } catch {
    throw new Error(
      "서버에 연결할 수 없습니다. 로컬에서는 API 서버가 실행 중인지 확인해 주세요."
    );
  }
  let data: {
    error?: string;
    designs?: ExplorationDesign[];
    allowedSubjects?: string[];
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error(`서버 응답을 해석할 수 없습니다 (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data.error ?? `요청 실패 (${res.status})`);
  }
  if (!data.designs?.length) {
    throw new Error("설계 결과가 비어 있습니다. 잠시 후 다시 시도해 주세요.");
  }
  return data as DesignApiResponse;
}
