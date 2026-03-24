const SUBJECT_POOL = [
  "국어",
  "수학",
  "영어",
  "사회(한국사/통합사회)",
  "과학(통합과학/물화생지)",
  "정보",
  "미술",
  "음악",
  "체육",
] as const;

export type SubjectLabel = (typeof SUBJECT_POOL)[number];

const MAJOR_RULES: { pattern: RegExp; add: SubjectLabel[] }[] = [
  { pattern: /의학|간호|약학|보건|치의/i, add: ["과학(통합과학/물화생지)", "수학"] },
  { pattern: /공학|기계|전자|컴퓨터|소프트웨어|AI|인공지능|로봇/i, add: ["수학", "정보", "과학(통합과학/물화생지)"] },
  { pattern: /경제|경영|회계|금융|무역/i, add: ["수학", "사회(한국사/통합사회)"] },
  { pattern: /법학|행정|정치|외교/i, add: ["사회(한국사/통합사회)", "국어"] },
  { pattern: /심리|교육|사회복지/i, add: ["사회(한국사/통합사회)", "국어"] },
  { pattern: /문학|언어|국어|영문/i, add: ["국어", "영어"] },
  { pattern: /미술|디자인|건축/i, add: ["미술", "수학"] },
  { pattern: /음악|실용음악/i, add: ["음악", "국어"] },
  { pattern: /체육|스포츠/i, add: ["체육", "과학(통합과학/물화생지)"] },
  { pattern: /화학|생명|바이오|환경/i, add: ["과학(통합과학/물화생지)", "수학"] },
  { pattern: /물리|천문/i, add: ["과학(통합과학/물화생지)", "수학"] },
  { pattern: /지리/i, add: ["사회(한국사/통합사회)", "과학(통합과학/물화생지)"] },
  { pattern: /역사/i, add: ["사회(한국사/통합사회)", "국어"] },
];

const KEYWORD_RULES: { pattern: RegExp; add: SubjectLabel[] }[] = [
  { pattern: /데이터|통계|그래프|분석|코딩|프로그래밍|알고리즘|AI|머신/i, add: ["정보", "수학"] },
  { pattern: /실험|화학|생물|물리|환경|기후|에너지/i, add: ["과학(통합과학/물화생지)", "수학"] },
  { pattern: /설문|인터뷰|사회|정책|불평등|지역/i, add: ["사회(한국사/통합사회)", "국어"] },
  { pattern: /독서|글쓰기|문학|비평|언어/i, add: ["국어", "영어"] },
  { pattern: /미술|시각|디자인|색/i, add: ["미술"] },
  { pattern: /음악|악기|작곡/i, add: ["음악"] },
  { pattern: /운동|체력|부상|스포츠과학/i, add: ["체육", "과학(통합과학/물화생지)"] },
];

function uniq(items: SubjectLabel[]): SubjectLabel[] {
  return [...new Set(items)];
}

export function resolveAllowedSubjects(major: string, keywords: string[]): string[] {
  const fromMajor: SubjectLabel[] = [];
  for (const rule of MAJOR_RULES) {
    if (rule.pattern.test(major)) fromMajor.push(...rule.add);
  }

  const fromKw: SubjectLabel[] = [];
  const kwText = keywords.join(" ");
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(kwText)) fromKw.push(...rule.add);
  }

  let merged = uniq([...fromMajor, ...fromKw]);
  if (merged.length < 3) {
    merged = uniq([
      ...merged,
      "국어",
      "수학",
      "과학(통합과학/물화생지)",
      "사회(한국사/통합사회)",
      "정보",
    ]);
  }
  return merged;
}

export const SUBJECT_REFERENCE = SUBJECT_POOL.join(", ");
