import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import "./App.css";
import { fetchRecommendations, type RecommendApiResponse, type TopicCard } from "./api";
import { validateRecommendForm } from "./validateRecommendInput";

const MBTI_TYPES = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
] as const;

const MBTI_CUSTOM = "__custom__";

const GRADE_LEVEL_OPTIONS = [
  { value: "", label: "선택 안 함" },
  { value: "상위권", label: "상위권" },
  { value: "중상위권", label: "중상위권" },
  { value: "중위권", label: "중위권" },
  { value: "중하위권", label: "중하위권" },
  { value: "하위권", label: "하위권" },
  { value: "비공개", label: "비공개" },
] as const;

const INQUIRY_STYLE_OPTIONS = [
  { value: "", label: "선택 안 함" },
  { value: "실험·관찰", label: "실험·관찰 중심" },
  { value: "설문·인터뷰", label: "설문·인터뷰" },
  { value: "데이터·코딩·분석", label: "데이터·코딩·분석" },
  { value: "독서·에세이·발표", label: "독서·에세이·발표" },
  { value: "사회이슈·정책 조사", label: "사회이슈·정책 조사" },
  { value: "상관없음", label: "특별히 없음" },
] as const;

function logEvent(name: string, detail?: Record<string, string>) {
  if (import.meta.env.DEV) {
    console.info(`[aicc] ${name}`, detail ?? "");
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function formatTopicBlock(t: TopicCard, index: number): string {
  const lines = [
    `【주제 ${index + 1}】 ${t.title}`,
    "",
    "교과 연계: " + t.subjects.join(", "),
    "",
    "핵심 탐구 질문: " + t.researchQuestion,
    "",
    "탐구 방법:",
    ...t.methods.map((m, i) => `${i + 1}. ${m}`),
    "",
    "결과물: " + t.deliverables.join(", "),
    "",
    "과정 점검 체크리스트:",
    ...t.processChecklist.map((c, i) => `${i + 1}. ${c}`),
    "",
    "AI·출처·윤리 안내: " + t.aiEthicsNote,
    "",
    "생기부 문장(참고 초안): " + t.recordSentence,
  ];
  return lines.join("\n");
}

function IconSectionBasic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M4 21v-1a7 7 0 0 1 14 0v1" strokeLinecap="round" />
    </svg>
  );
}

function IconSectionInterest() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" strokeLinejoin="round" />
      <path d="M5 19h14" strokeLinecap="round" />
    </svg>
  );
}

function IconSectionExperience() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M8 7h8M8 11h6" strokeLinecap="round" />
    </svg>
  );
}

function IconSectionCta() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8Z" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const [major, setMajor] = useState("");
  const [k1, setK1] = useState("");
  const [k2, setK2] = useState("");
  const [k3, setK3] = useState("");
  const [grade, setGrade] = useState("고1");
  const [mbtiSelect, setMbtiSelect] = useState<string>("");
  const [mbtiCustom, setMbtiCustom] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [inquiryStyle, setInquiryStyle] = useState("");
  const [constraintsNote, setConstraintsNote] = useState("");
  const [perf, setPerf] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendApiResponse | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const errorBannerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!error) return;
    const el = errorBannerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    });
  }, [error]);

  useEffect(() => {
    if (!result) return;
    const el = resultsRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus();
    });
  }, [result]);

  const mbtiResolved = useMemo(() => {
    if (mbtiSelect === MBTI_CUSTOM) return mbtiCustom;
    return mbtiSelect;
  }, [mbtiSelect, mbtiCustom]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const onCopy = useCallback(
    async (label: string, text: string) => {
      const ok = await copyText(text);
      logEvent("copy", { section: label });
      showToast(ok ? "복사했습니다." : "복사에 실패했습니다. 브라우저 권한을 확인하세요.");
    },
    [showToast]
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const keywords = [k1.trim(), k2.trim(), k3.trim()] as [string, string, string];
    const clientErr = validateRecommendForm({
      major,
      keywords,
      mbtiOrTrait: mbtiResolved,
      gradeLevel,
      performanceExperience: perf,
      constraintsNote,
    });
    if (clientErr) {
      setError(clientErr);
      return;
    }
    logEvent("generate_click");
    setLoading(true);
    try {
      const data = await fetchRecommendations({
        major: major.trim(),
        keywords,
        grade,
        mbtiOrTrait: mbtiResolved.trim() || undefined,
        gradeLevel: gradeLevel.trim() || undefined,
        performanceExperience: perf.trim() || undefined,
        inquiryStyle: inquiryStyle.trim() || undefined,
        constraintsNote: constraintsNote.trim() || undefined,
      });
      setResult(data);
      logEvent("generate_ok", { count: String(data.topics.length) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(msg);
      logEvent("generate_error", { message: msg });
    } finally {
      setLoading(false);
    }
  };

  const keywordPlaceholders = ["예: 뇌과학", "예: 데이터", "예: 사회문제"];

  return (
    <div className="app">
      <header className="app-topbar">
        <img src="/aicc-logo.png" alt="AICC" className="app-logo" width={120} height={48} />
        <div className="app-brand">
          <h1 className="app-brand__title">AI 탐구 주제 설계 도구</h1>
          <p className="app-brand__subtitle">
            교과에 맞는 탐구 주제, 실행 순서, 생기부 문장 초안을 한 번에 받아보세요.
          </p>
        </div>
      </header>

      <section className="alert alert--info info-guide" role="note" aria-labelledby="usage-guide-title">
        <div className="info-guide__head">
          <span className="info-guide__icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </span>
          <p id="usage-guide-title" className="info-guide__title">
            이용 안내
          </p>
        </div>
        <p className="info-guide__lead">
          본 서비스는 <strong>탐구·수행 계획을 짤 때 참고하는 도구</strong>입니다. 입시 합격이나 내신 등급을 보장하지 않습니다.
        </p>
        <ul className="info-guide__list">
          <li>2028 대입 개편, 고교학점제, 과정중심 수행평가 흐름에 맞춰 주제와 단계를 제안합니다.</li>
          <li>
            생기부(세특·행특) 문장은 <strong>참고 초안</strong>입니다. 실제 기재는{' '}
            <strong>학교생활기록부 기재요령</strong>과 <strong>담임교사 관찰</strong>을 따릅니다.
          </li>
          <li>
            하지 않은 활동을 한 것처럼 쓰거나, AI 출력을 검토 없이 그대로 제출하면{' '}
            <strong>수행평가·AI 활용 학교 지침</strong>에 맞지 않을 수 있습니다.
          </li>
        </ul>
      </section>

      {toast && (
        <div className="alert alert--success" role="status" aria-live="polite">
          {toast}
        </div>
      )}
      {error && (
        <div
          ref={errorBannerRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="alert alert--error"
        >
          {error}
        </div>
      )}

      <div className="form-stack-wrap">
        <form className={`form-stack ${loading ? "form-stack--loading" : ""}`} onSubmit={onSubmit} aria-busy={loading}>
        <section className="form-section" aria-labelledby="sec-basic">
          <div className="section-head">
            <span className="section-icon">
              <IconSectionBasic />
            </span>
            <div>
              <h2 id="sec-basic">기본 정보</h2>
              <p className="section-desc">지원 방향의 뼈대가 되는 전공과 학년을 입력합니다.</p>
            </div>
          </div>
          <div className="form-grid cols-2">
            <div className="field">
              <label className="field-label" htmlFor="major">
                희망 전공
                <span className="badge-req">필수</span>
              </label>
              <input
                id="major"
                className="input-base"
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="컴퓨터공학, 심리학 등"
                maxLength={200}
                autoComplete="off"
              />
              <span className="field-hint">2글자 이상, 구체적인 전공명을 권장합니다.</span>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="grade">
                현재 학년
                <span className="badge-req">필수</span>
              </label>
              <select
                id="grade"
                className="text-like input-base"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="중3">중3</option>
                <option value="고1">고1</option>
                <option value="고2">고2</option>
              </select>
            </div>
          </div>
        </section>

        <section className="form-section" aria-labelledby="sec-interest">
          <div className="section-head">
            <span className="section-icon">
              <IconSectionInterest />
            </span>
            <div>
              <h2 id="sec-interest">관심 및 성향</h2>
              <p className="section-desc">탐구 주제의 방향을 좁히는 키워드와 선택 정보입니다.</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">
                관심 키워드 3개
                <span className="badge-req">필수</span>
              </label>
              <span className="field-hint" style={{ marginTop: 0 }}>
                각 칸에 짧은 키워드 하나씩 입력하세요. 태그처럼 정리됩니다.
              </span>
              <div className="keyword-tags">
                <div className="tag-field">
                  <span className="tag-hash" aria-hidden>
                    #
                  </span>
                  <input
                    type="text"
                    value={k1}
                    onChange={(e) => setK1(e.target.value)}
                    placeholder={keywordPlaceholders[0]}
                    maxLength={80}
                    autoComplete="off"
                    aria-label="관심 키워드 1"
                  />
                </div>
                <div className="tag-field">
                  <span className="tag-hash" aria-hidden>
                    #
                  </span>
                  <input
                    type="text"
                    value={k2}
                    onChange={(e) => setK2(e.target.value)}
                    placeholder={keywordPlaceholders[1]}
                    maxLength={80}
                    autoComplete="off"
                    aria-label="관심 키워드 2"
                  />
                </div>
                <div className="tag-field">
                  <span className="tag-hash" aria-hidden>
                    #
                  </span>
                  <input
                    type="text"
                    value={k3}
                    onChange={(e) => setK3(e.target.value)}
                    placeholder={keywordPlaceholders[2]}
                    maxLength={80}
                    autoComplete="off"
                    aria-label="관심 키워드 3"
                  />
                </div>
              </div>
            </div>
            <div className="form-grid cols-2">
              <div className="field">
                <label className="field-label" htmlFor="mbti">
                  MBTI / 성향
                  <span className="badge-opt">선택</span>
                </label>
                <select
                  id="mbti"
                  className="text-like input-base"
                  value={mbtiSelect}
                  onChange={(e) => setMbtiSelect(e.target.value)}
                >
                  <option value="">선택 안 함</option>
                  {MBTI_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value={MBTI_CUSTOM}>기타 (직접 입력)</option>
                </select>
                {mbtiSelect === MBTI_CUSTOM && (
                  <>
                    <input
                      id="mbti-custom"
                      className="input-base"
                      style={{ marginTop: "0.55rem" }}
                      type="text"
                      value={mbtiCustom}
                      onChange={(e) => setMbtiCustom(e.target.value)}
                      placeholder="예: 계획형, 사람 중심"
                      maxLength={100}
                      autoComplete="off"
                    />
                    <span className="field-hint">
                      MBTI가 없으면 성향을 한 줄로 적어 주세요. 입력하지 않으면 성향 정보 없이 진행됩니다.
                    </span>
                  </>
                )}
              </div>
              <div className="field">
                <label className="field-label" htmlFor="gradeLevel">
                  내신 수준
                  <span className="badge-opt">선택</span>
                </label>
                <select
                  id="gradeLevel"
                  className="text-like input-base"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                >
                  {GRADE_LEVEL_OPTIONS.map((o) => (
                    <option key={o.value || "none"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="field-hint">자기평가 기준이며, 외부에 저장되지 않습니다.</span>
              </div>
            </div>
            <div className="form-grid cols-2">
              <div className="field">
                <label className="field-label" htmlFor="inquiryStyle">
                  희망 탐구 방식
                  <span className="badge-opt">선택</span>
                </label>
                <select
                  id="inquiryStyle"
                  className="text-like input-base"
                  value={inquiryStyle}
                  onChange={(e) => setInquiryStyle(e.target.value)}
                >
                  {INQUIRY_STYLE_OPTIONS.map((o) => (
                    <option key={o.value || "none"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="field-hint">주제 유형을 좁히면 수행 계획이 더 구체적으로 나옵니다.</span>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="constraintsNote">
                  기간·장소·조건
                  <span className="badge-opt">선택</span>
                </label>
                <input
                  id="constraintsNote"
                  className="input-base"
                  type="text"
                  value={constraintsNote}
                  onChange={(e) => setConstraintsNote(e.target.value)}
                  placeholder="예: 2주 안, 실험실 없음, 혼자 진행"
                  maxLength={200}
                  autoComplete="off"
                />
                <span className="field-hint">비워 두어도 됩니다. 입력 시 5글자 이상 권장.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="form-section" aria-labelledby="sec-exp">
          <div className="section-head">
            <span className="section-icon">
              <IconSectionExperience />
            </span>
            <div>
              <h2 id="sec-exp">경험 및 배경</h2>
              <p className="section-desc">이미 해본 수행·탐구가 있으면 주제 설계에 반영합니다.</p>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="perf">
              수행평가·탐구 경험
              <span className="badge-opt">선택</span>
            </label>
            <textarea
              id="perf"
              className="input-base"
              value={perf}
              onChange={(e) => setPerf(e.target.value)}
              placeholder="예: 과학 수행에서 실험 설계·보고서 작성, 독서 활동에서 사회 이슈 에세이 등"
              maxLength={500}
              rows={4}
            />
            <span className="field-hint">비워 두어도 됩니다. 입력 시 5글자 이상 구체적으로 적어 주세요.</span>
          </div>
        </section>

        <section className="form-section section-cta" aria-labelledby="sec-cta">
          <div className="section-head">
            <span className="section-icon">
              <IconSectionCta />
            </span>
            <div>
              <h2 id="sec-cta">결과 생성</h2>
              <p className="section-desc">입력을 바탕으로 교과 연계 탐구안을 생성합니다.</p>
            </div>
          </div>
          <button type="submit" className="btn-cta" disabled={loading}>
            {loading ? "생성 중…" : "탐구 주제 생성"}
          </button>
        </section>
      </form>

        {loading && (
          <div className="form-loading-overlay" role="status" aria-live="polite" aria-label="주제 생성 중">
            <div className="form-loading-inner">
              <span className="form-loading-spinner" aria-hidden />
              <p className="form-loading-text">주제를 설계하는 중입니다…</p>
              <p className="form-loading-hint">보통 수십 초 이내에 완료됩니다.</p>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div
          ref={resultsRef}
          tabIndex={-1}
          className="results-block"
          aria-label="생성 결과 영역"
        >
          <p className="sr-only" aria-live="polite">
            결과 {result.topics.length}개가 생성되었습니다.
          </p>
          <h2 className="results-title">생성 결과</h2>
          <div className="meta-chips">
            <span>교과 후보 엔진 반영</span>
            {result.allowedSubjects.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>

          <div className="copy-all-wrap">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                onCopy(
                  "전체",
                  result.topics.map((t, i) => formatTopicBlock(t, i)).join("\n\n---\n\n")
                )
              }
            >
              전체 결과 복사
            </button>
          </div>

          {result.topics.map((t, idx) => (
            <article key={idx} className="topic-card">
              <h2>
                주제 {idx + 1}. {t.title}
              </h2>

              <div className="section">
                <h3>핵심 탐구 질문</h3>
                <p className="text-block">{t.researchQuestion}</p>
                <div className="copy-row">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onCopy("탐구질문", t.researchQuestion)}
                  >
                    질문만 복사
                  </button>
                </div>
              </div>

              <div className="section">
                <h3>교과 연계</h3>
                <div className="chips">
                  {t.subjects.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <div className="copy-row">
                  <button type="button" className="btn-ghost" onClick={() => onCopy("교과", t.subjects.join(", "))}>
                    교과만 복사
                  </button>
                </div>
              </div>

              <div className="section">
                <h3>탐구 방법</h3>
                <ul>
                  {t.methods.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
                <div className="copy-row">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onCopy("탐구방법", t.methods.map((m, i) => `${i + 1}. ${m}`).join("\n"))}
                  >
                    단계 복사
                  </button>
                </div>
              </div>

              <div className="section">
                <h3>결과물 형태</h3>
                <div className="chips">
                  {t.deliverables.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="copy-row">
                  <button type="button" className="btn-ghost" onClick={() => onCopy("결과물", t.deliverables.join(", "))}>
                    결과물 복사
                  </button>
                </div>
              </div>

              <div className="section">
                <h3>과정 점검 체크리스트</h3>
                <ul>
                  {t.processChecklist.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                <div className="copy-row">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onCopy("체크리스트", t.processChecklist.map((c, i) => `${i + 1}. ${c}`).join("\n"))}
                  >
                    체크리스트 복사
                  </button>
                </div>
              </div>

              <div className="section section--ethics">
                <h3>AI·출처·개인정보 안내</h3>
                <p className="text-block text-block--muted">{t.aiEthicsNote}</p>
                <div className="copy-row">
                  <button type="button" className="btn-ghost" onClick={() => onCopy("윤리안내", t.aiEthicsNote)}>
                    안내 문구 복사
                  </button>
                </div>
              </div>

              <div className="section">
                <h3>생기부 문장 참고 초안</h3>
                <p className="text-block">{t.recordSentence}</p>
                <p className="field-hint" style={{ marginTop: "0.5rem" }}>
                  실제 기재는 학교 기재요령·교사 관찰에 따릅니다. 미수행을 한 것처럼 옮기지 마세요.
                </p>
                <div className="copy-row">
                  <button type="button" className="btn-ghost" onClick={() => onCopy("생기부", t.recordSentence)}>
                    문장 복사
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onCopy(`주제카드${idx + 1}`, formatTopicBlock(t, idx))}
                  >
                    이 카드 전체 복사
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
