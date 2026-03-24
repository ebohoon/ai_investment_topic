/**
 * 2022 개정 교육과정 고등학교 교과(군)·선택 유형·과목명 구조 (2028 대입 맥락).
 * UI 전용 — 서버 enum 문자열과 동일하게 유지합니다.
 */

export const COURSE_CATEGORY_OPTIONS = [
  "공통과목(기초소양)",
  "일반선택(학문별 주요내용)",
  "진로선택(심화과목)",
  "융합선택(교과융합·실생활응용)",
] as const;

export type CourseCategory = (typeof COURSE_CATEGORY_OPTIONS)[number];

/** API·서버 `selectedSubject` 값 (내부 키) */
export const SUBJECT_GROUP_KEYS = [
  "국어",
  "수학",
  "영어",
  "사회",
  "과학",
  "정보",
  "기타",
] as const;

export type SubjectGroupKey = (typeof SUBJECT_GROUP_KEYS)[number];

/** 드롭다운 표시용 라벨 */
export const SUBJECT_GROUP_LABELS: Record<SubjectGroupKey, string> = {
  국어: "국어",
  수학: "수학",
  영어: "영어",
  사회: "사회 (역사·도덕 포함)",
  과학: "과학",
  정보: "정보",
  기타: "기타 (직접 입력)",
};

/** 표에 없는 정보 과목은 개정 교육과정 일반 명칭을 반영한 예시 목록입니다. */
const CURRICULUM_TREE: Record<
  Exclude<SubjectGroupKey, "기타">,
  Record<CourseCategory, readonly string[]>
> = {
  국어: {
    "공통과목(기초소양)": ["공통국어1", "공통국어2"],
    "일반선택(학문별 주요내용)": ["화법과 언어", "독서와 작문", "문학"],
    "진로선택(심화과목)": ["주제 탐구 독서", "문학과 영상", "직무 의사소통"],
    "융합선택(교과융합·실생활응용)": ["독서 토론과 글쓰기", "매체 의사소통", "언어생활 탐구"],
  },
  수학: {
    "공통과목(기초소양)": ["공통수학1", "공통수학2", "기본수학1", "기본수학2"],
    "일반선택(학문별 주요내용)": ["대수", "미적분 I", "확률과 통계"],
    "진로선택(심화과목)": ["기하", "미적분II", "경제 수학", "인공지능 수학", "직무 수학"],
    "융합선택(교과융합·실생활응용)": ["수학과 문화", "실용 통계", "수학과제 탐구"],
  },
  영어: {
    "공통과목(기초소양)": ["공통영어1", "공통영어2", "기본영어1", "기본영어2"],
    "일반선택(학문별 주요내용)": ["영어 I", "영어II", "영어 독해와 작문"],
    "진로선택(심화과목)": [
      "영미 문학 읽기",
      "영어 발표와 토론",
      "심화 영어",
      "심화 영어 독해와 작문",
      "직무 영어",
    ],
    "융합선택(교과융합·실생활응용)": ["실생활 영어 회화", "미디어 영어", "세계 문화와 영어"],
  },
  사회: {
    "공통과목(기초소양)": ["한국사1", "한국사2", "통합사회1", "통합사회2"],
    "일반선택(학문별 주요내용)": ["세계시민과 지리", "세계사", "사회와 문화", "현대사회와 윤리"],
    "진로선택(심화과목)": [
      "한국지리 탐구",
      "도시의 미래 탐구",
      "동아시아 역사 기행",
      "정치",
      "법과 사회",
      "경제",
      "윤리와 사상",
      "인문학과 윤리",
      "국제 관계의 이해",
    ],
    "융합선택(교과융합·실생활응용)": [
      "여행지리",
      "역사로 탐구하는 현대 세계",
      "사회문제 탐구",
      "금융과 경제생활",
      "윤리문제 탐구",
      "기후변화와 지속가능한 세계",
    ],
  },
  과학: {
    "공통과목(기초소양)": ["통합과학1", "통합과학2", "과학탐구실험1", "과학탐구실험2"],
    "일반선택(학문별 주요내용)": ["물리학", "화학", "생명과학", "지구과학"],
    "진로선택(심화과목)": [
      "역학과 에너지",
      "전자기와 양자",
      "물질과 에너지",
      "화학 반응의 세계",
      "세포와 물질대사",
      "생물의 유전",
      "지구시스템과학",
      "행성우주과학",
    ],
    "융합선택(교과융합·실생활응용)": [
      "과학의 역사와 문화",
      "기후변화와 환경생태",
      "융합과학 탐구",
    ],
  },
  정보: {
    "공통과목(기초소양)": ["디지털 문화", "데이터와 정보"],
    "일반선택(학문별 주요내용)": ["데이터 과학", "소프트웨어와 생활"],
    "진로선택(심화과목)": ["인공지능 기초", "정보과학"],
    "융합선택(교과융합·실생활응용)": ["인공지능과 데이터", "디지털 제작", "융합 프로젝트"],
  },
};

const STRUCTURED_GROUPS = ["국어", "수학", "영어", "사회", "과학", "정보"] as const;

export function isStructuredSubjectGroup(g: string): g is Exclude<SubjectGroupKey, "기타"> {
  return (STRUCTURED_GROUPS as readonly string[]).includes(g);
}

export function getCourseNames(
  group: Exclude<SubjectGroupKey, "기타">,
  category: CourseCategory
): string[] {
  return [...CURRICULUM_TREE[group][category]];
}

export function getAllCourseNamesForGroup(group: Exclude<SubjectGroupKey, "기타">): string[] {
  return COURSE_CATEGORY_OPTIONS.flatMap((c) => [...CURRICULUM_TREE[group][c]]);
}
