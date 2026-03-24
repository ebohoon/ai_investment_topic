/** 서버 input.ts 규칙과 동일하게 유지 (제출 전 안내용) */

function isOnlyRepeatedChar(s: string): boolean {
  return s.length >= 2 && /^(.)\1+$/.test(s);
}

export type RecommendFormInput = {
  major: string;
  keywords: [string, string, string];
  mbtiOrTrait: string;
  gradeLevel: string;
  performanceExperience: string;
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
    if (k.length < 2) {
      return "관심 키워드는 각각 2글자 이상 입력해 주세요.";
    }
    if (isOnlyRepeatedChar(k)) {
      return "키워드에 같은 글자만 반복된 입력은 사용할 수 없습니다.";
    }
  }

  const optionals: [string, string][] = [
    ["성향/MBTI", input.mbtiOrTrait],
    ["내신 수준", input.gradeLevel],
  ];
  for (const [label, raw] of optionals) {
    const t = raw.trim();
    if (t.length === 1) {
      return `${label}은(는) 비워 두거나 2글자 이상 입력해 주세요.`;
    }
    if (t.length >= 2 && isOnlyRepeatedChar(t)) {
      return `${label}에 의미 없는 반복 입력은 사용할 수 없습니다.`;
    }
  }

  const perf = input.performanceExperience.trim();
  if (perf.length > 0 && perf.length < 5) {
    return "수행·탐구 경험은 비워 두거나, 5글자 이상 구체적으로 입력해 주세요.";
  }
  if (perf.length >= 2 && isOnlyRepeatedChar(perf)) {
    return "수행·탐구 경험에 의미 없는 반복 입력은 사용할 수 없습니다.";
  }

  return null;
}
