import type { ZodError } from "zod";

/** Zod 객체 검증 실패 시 formErrors는 비는 경우가 많아, issues 기반으로 짧게 요약 */
export function summarizeZodError(e: ZodError, maxIssues = 6): string {
  const parts = e.issues.slice(0, maxIssues).map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "root";
    return `${path}: ${issue.message}`;
  });
  return parts.join(" | ") || e.message;
}
