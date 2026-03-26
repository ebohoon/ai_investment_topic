/** 2022 개정 중학교 교과(군) → 과목명 (클라이언트 curriculumData와 동기화) */

export function isMiddleSchoolGrade(grade: string): boolean {
  return /^중[123]$/.test(grade.trim());
}

export const MIDDLE_SUBJECT_TO_COURSES: Record<string, readonly string[]> = {
  국어: ["국어"],
  수학: ["수학"],
  사회: ["사회", "역사"],
  과학: ["과학"],
  영어: ["영어"],
  체육: ["체육"],
  예술: ["음악", "미술"],
  "기술·가정": ["기술·가정"],
  정보: ["정보"],
};

export function isValidMiddleCurriculum(subject: string, courseName: string): boolean {
  const list = MIDDLE_SUBJECT_TO_COURSES[subject];
  if (!list) return false;
  return list.includes(courseName.trim());
}
