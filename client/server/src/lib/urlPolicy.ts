/**
 * 탐구 설계 JSON에 허용할 출처 URL 정책(메인·홈만 넣는 출력 완화).
 */

const BLOCKED_HOST_EXACT = new Set<string>([
  "dcinside.com",
  "www.dcinside.com",
  "m.dcinside.com",
]);

const DISALLOWED_HOST_SUBSTRINGS = ["localhost", "127.0.0.1", "example.com", "invalid"];

function isNamuWikiHost(host: string): boolean {
  return host === "namu.wiki" || host.endsWith(".namu.wiki");
}

/** YouTube 메인·피드가 아닌, 특정 동영상 주소인지 */
export function isYouTubeDeepLink(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id.length >= 6;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && v.length >= 6) return true;
      if (u.pathname.startsWith("/embed/") && u.pathname.length > "/embed/".length + 4) return true;
      if (u.pathname.startsWith("/shorts/") && u.pathname.length > "/shorts/".length + 4) return true;
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

/** PDF·논문 항목: 메인 화면이 아닌 문서·초록 직접 링크인지 */
export function looksLikePaperOrPdfUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const path = u.pathname;
    const lp = path.toLowerCase();
    if (lp.endsWith(".pdf")) return true;
    if (lp.includes("/pdf/")) return true;
    const host = u.hostname.toLowerCase();
    if (host.includes("arxiv.org") && (lp.includes("/pdf/") || lp.includes("/abs/"))) return true;
    if (host === "doi.org" || host.endsWith(".doi.org")) return path.length > 1;
    return false;
  } catch {
    return false;
  }
}

/** [12] 제목 접두로 유형 추정 */
export function inferRelatedUrlKind(title: string): "youtube" | "pdf" | "other" {
  const t = title.trim();
  if (/^\[YouTube\]/i.test(t) || /^\[유튜브\]/i.test(t)) return "youtube";
  if (/^\[PDF\]/i.test(t)) return "pdf";
  return "other";
}

/** null 이면 통과, 아니면 한국어 오류 메시지 */
export function urlOutputPolicyViolation(urlStr: string): string | null {
  const t = urlStr.trim();
  if (t.length === 0) return "URL이 비어 있습니다.";
  if (!t.startsWith("https://")) return "URL은 https로 시작해야 합니다.";
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return "올바른 URL 형식이 아닙니다.";
  }
  if (u.protocol !== "https:") return "URL은 https만 허용됩니다.";

  const host = u.hostname.toLowerCase();
  if (isNamuWikiHost(host) || BLOCKED_HOST_EXACT.has(host)) {
    return "이 도메인은 출처로 사용할 수 없습니다.";
  }
  for (const sub of DISALLOWED_HOST_SUBSTRINGS) {
    if (host.includes(sub)) return "허용되지 않는 도메인입니다.";
  }
  return null;
}

export type RecommendedSourceType = "youtube" | "paper_pdf" | "institution" | "news";

/** [3] recommendedSources 1건 */
export function urlOutputPolicyViolationForRecommendedSource(
  urlStr: string,
  sourceType: RecommendedSourceType
): string | null {
  const base = urlOutputPolicyViolation(urlStr);
  if (base) return base;
  if (sourceType === "youtube" && !isYouTubeDeepLink(urlStr)) {
    return "YouTube는 메인이 아니라 watch?v=… 또는 youtu.be/VIDEO_ID 형식의 동영상 주소만 넣으세요.";
  }
  if (sourceType === "paper_pdf" && !looksLikePaperOrPdfUrl(urlStr)) {
    return "paper_pdf는 .pdf·arxiv·doi 등 논문·문서 직접 링크만 넣으세요. 기관 포털 메인만 넣지 마세요.";
  }
  return null;
}

/** [12] 관련 검색 1건 — 제목 태그에 따라 엄격히 */
export function urlOutputPolicyViolationForRelatedItem(title: string, urlStr: string): string | null {
  const base = urlOutputPolicyViolation(urlStr);
  if (base) return base;
  const kind = inferRelatedUrlKind(title);
  if (kind === "youtube" && !isYouTubeDeepLink(urlStr)) {
    return "[YouTube] 항목은 watch?v= 또는 youtu.be/… 동영상 주소만 넣으세요.";
  }
  if (kind === "pdf" && !looksLikePaperOrPdfUrl(urlStr)) {
    return "[PDF] 항목은 .pdf·arxiv·doi 등 문서 직접 링크만 넣으세요.";
  }
  return null;
}
