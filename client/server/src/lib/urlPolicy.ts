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

/** PDF·논문 항목: 메인 화면이 아닌 문서·초록·논문 랜딩 직접 링크인지 */
export function looksLikePaperOrPdfUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const path = u.pathname;
    const lp = path.toLowerCase();
    const host = u.hostname.toLowerCase();
    const q = u.search.toLowerCase();

    if (lp.endsWith(".pdf")) return true;
    if (lp.includes("/pdf/")) return true;
    if (host.includes("arxiv.org") && (lp.includes("/pdf/") || lp.includes("/abs/"))) return true;
    if (host === "doi.org" || host.endsWith(".doi.org")) return path.length > 1;

    if (host.includes("semanticscholar.org") && lp.includes("/paper/")) return true;
    if (host === "pubmed.ncbi.nlm.nih.gov") return lp.length > 1;
    if (host.includes("ncbi.nlm.nih.gov") && lp.includes("/pmc/articles/")) return true;
    if (host.includes("ieee.org") && lp.includes("/document/")) return true;
    if (host.includes("sciencedirect.com") && lp.includes("/science/article/")) return true;
    if (
      (host.includes("springer.com") || host.includes("link.springer.com")) &&
      (lp.includes("/article/") || lp.includes("/chapter/"))
    )
      return true;
    if (host.includes("nature.com") && lp.includes("/articles/")) return true;
    if (host.includes("science.org") && lp.includes("/doi/")) return true;
    if (host === "jstor.org" && lp.includes("/stable/")) return true;
    if (host.includes("frontiersin.org") && lp.includes("/articles/")) return true;
    if (host.includes("mdpi.com") && /\/\d+/.test(lp)) return true;
    if (host.includes("zenodo.org") && lp.includes("/record/")) return true;
    if (host.includes("ssrn.com") && (lp.includes("/abstract=") || q.includes("abstract_id="))) return true;
    if (host.includes("hal.science") && lp.length > 12) return true;
    if (host.includes("kisti.re.kr") && (lp.includes("/article/") || lp.includes("/journal/"))) return true;
    if (host.includes("koreascience.or.kr") && (lp.includes("/article/") || lp.includes("/journal/")))
      return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * 모델이 url에 "[PDF] https://…"처럼 붙이는 경우 첫 https 주소만 추출.
 * 없으면 원문 유지(이후 검증에서 걸림).
 */
export function extractFirstHttpsUrl(raw: string): string {
  const t = raw.trim();
  const m = t.match(/https:\/\/[^\s\]"'<>\]\u201c\u201d]+/);
  if (!m) return t;
  let u = m[0];
  u = u.replace(/[),.;}\]]+$/u, "");
  return u;
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

/**
 * 사이트 홈(경로가 비어 있거나 `/`만)인지 — 기관·뉴스는 주제별 딥링크를 요구할 때 사용.
 * `…/main.do?page=…` 등은 정부·포털에서 흔해 별도로 막지 않는다.
 */
export function isLikelySiteRootOnlyPath(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const raw = u.pathname.replace(/\/+$/u, "");
    return raw === "" || raw === "/";
  } catch {
    return false;
  }
}

/** [11] recommendedSources 1건 */
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
  if (
    (sourceType === "institution" || sourceType === "news") &&
    isLikelySiteRootOnlyPath(urlStr)
  ) {
    return "기관·언론은 사이트 첫 화면(홈) URL이 아니라, 해당 주제의 보고서·통계표·데이터셋·기사·안내 페이지처럼 내용이 열리는 구체 주소를 넣으세요.";
  }
  return null;
}

/**
 * Zod 검증 전에 URL·유형을 보정해 불필요한 재시도를 줄임.
 * - recommendedSources[].url에서 첫 https 추출
 * - paper_pdf인데 논문형 URL이 아니면 institution으로 하향(기관 홈·포털 등)
 */
export function normalizeExplorationDesignPayload(data: unknown): void {
  if (!data || typeof data !== "object" || Array.isArray(data)) return;
  const d = data as Record<string, unknown>;

  const rs = d.recommendedSources;
  if (Array.isArray(rs)) {
    for (const item of rs) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      if (typeof o.url !== "string") continue;
      const urlRs = extractFirstHttpsUrl(o.url);
      o.url = urlRs;
      if (o.sourceType === "paper_pdf" && !looksLikePaperOrPdfUrl(urlRs)) {
        if (urlOutputPolicyViolation(urlRs) === null) {
          o.sourceType = "institution";
        }
      }
    }
  }
}
