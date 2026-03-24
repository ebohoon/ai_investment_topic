import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./App.css";
import {
  fetchExplorationDesign,
  fetchResearchQuestions,
  type ExplorationDesign,
  type ExplorationPayload,
} from "./api";
import {
  COURSE_CATEGORY_OPTIONS,
  getCourseNames,
  SUBJECT_GROUP_LABELS,
  SUBJECT_GROUP_KEYS,
  type CourseCategory,
  type SubjectGroupKey,
} from "./curriculumData";
import {
  AI_USAGE_LEVELS,
  GOAL_LEVELS,
  INQUIRY_TYPES,
  OUTPUT_FORMATS,
  validateExplorationForm,
  validateExplorationStep1,
  validateExplorationStep2Full,
  validateExplorationStep3,
  type RecommendFormInput,
} from "./validateRecommendInput";

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

const SCHOOL_GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"] as const;

const GRADE_LEVEL_OPTIONS = [
  { value: "상위권", label: "상위권" },
  { value: "중상위권", label: "중상위권" },
  { value: "중위권", label: "중위권" },
  { value: "중하위권", label: "중하위권" },
  { value: "하위권", label: "하위권" },
  { value: "비공개", label: "비공개" },
] as const;

const INQUIRY_STYLE_OPTIONS = [
  { value: "실험·관찰", label: "실험·관찰 중심" },
  { value: "설문·인터뷰", label: "설문·인터뷰" },
  { value: "데이터·코딩·분석", label: "데이터·코딩·분석" },
  { value: "독서·에세이·발표", label: "독서·에세이·발표" },
  { value: "사회이슈·정책 조사", label: "사회이슈·정책 조사" },
  { value: "상관없음", label: "특별히 없음" },
] as const;

const CONSTRAINT_PERIOD_OPTIONS = [
  { value: "1주 이내", label: "1주 이내" },
  { value: "2~4주", label: "2~4주" },
  { value: "한 학기 정도", label: "한 학기 정도" },
  { value: "일정 미정·여유 있음", label: "일정 미정·여유 있음" },
] as const;

const CONSTRAINT_PLACE_OPTIONS = [
  { value: "집·온라인 위주", label: "집·온라인 위주" },
  { value: "학교 교실", label: "학교 교실" },
  { value: "실험실·준비된 장소 가능", label: "실험실·준비된 장소 가능" },
  { value: "도서관·독서실 등", label: "도서관·독서실 등" },
  { value: "야외·지역사회", label: "야외·지역사회" },
] as const;

const CONSTRAINT_TEAM_OPTIONS = [
  { value: "혼자", label: "혼자" },
  { value: "2~3명", label: "2~3명" },
  { value: "모둠(4명 이상)", label: "모둠(4명 이상)" },
  { value: "교사와 사전 협의 필요", label: "교사와 사전 협의 필요" },
] as const;

const CONSTRAINT_BUDGET_OPTIONS = [
  { value: "추가 비용 없이", label: "추가 비용 없이" },
  { value: "집·학교 재료로 가능", label: "집·학교 재료로 가능" },
  { value: "소액(만 원 안팎)까지 가능", label: "소액(만 원 안팎)까지 가능" },
  { value: "비용·재료 제약 없음", label: "비용·재료 제약 없음" },
  { value: "잘 모르겠음", label: "잘 모르겠음" },
] as const;

const STEP_LABELS = [
  "교과·기본",
  "관심·조건",
  "탐구 유형",
  "탐구 질문",
  "탐구 설계",
] as const;

const MAX_EXPLORATION_QUESTION_PICKS = 5;

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

function formatDesignBlock(d: ExplorationDesign): string {
  return [
    `【탐구 주제】 ${d.title}`,
    "",
    `【탐구 질문】 ${d.researchQuestion}`,
    "",
    "【탐구 개요·목적】",
    d.overview,
    "",
    "【탐구 방법】",
    ...d.methodSteps.map((m, i) => `${i + 1}. ${m}`),
    "",
    "【기대 결과】",
    d.expectedResults,
    "",
    "【확장 방향】",
    d.extensionDirections,
    "",
    "【교과 연계】 " + d.subjects.join(", "),
    "",
    "【과정 점검】",
    ...d.processChecklist.map((c, i) => `${i + 1}. ${c}`),
    "",
    "【AI·출처·윤리】",
    d.aiEthicsNote,
    "",
    "【세특·생기부 문장 초안(참고)】",
    d.recordSentence,
  ].join("\n");
}

function formatDesignBlockWithSource(sourceQuestion: string, d: ExplorationDesign): string {
  return [`【선택한 탐구 질문】 ${sourceQuestion}`, "", formatDesignBlock(d)].join("\n");
}

function formatAllDesignsBlock(sourceQuestions: string[], designs: ExplorationDesign[]): string {
  return designs
    .map((d, i) => {
      const q = sourceQuestions[i] ?? "";
      const block = formatDesignBlockWithSource(q, d);
      return `════════ ${i + 1}번 질문에 대한 탐구 설계 ════════\n\n${block}`;
    })
    .join("\n\n\n");
}

function DesignResultCard({
  design,
  index,
  sourceQuestion,
  onCopy,
}: {
  design: ExplorationDesign;
  index: number;
  sourceQuestion: string;
  onCopy: (label: string, text: string) => void | Promise<void>;
}) {
  const n = index + 1;
  const exportBlock = formatDesignBlockWithSource(sourceQuestion, design);
  return (
    <article
      className="topic-card design-result-card design-result-card--item"
      aria-labelledby={`design-card-${index}-title`}
    >
      <div className="design-result-item__head">
        <span className="design-result-item__badge">탐구 설계 {n}</span>
        <h3 className="design-result-item__source-label">선택한 질문</h3>
        <p className="design-result-item__source-q">{sourceQuestion}</p>
      </div>

      <h2 id={`design-card-${index}-title`} className="design-result-title">
        {design.title}
      </h2>

      <div className="section">
        <h3>탐구 질문</h3>
        <p className="text-block">{design.researchQuestion}</p>
      </div>

      <div className="section">
        <h3>탐구 개요·목적</h3>
        <p className="text-block">{design.overview}</p>
      </div>

      <div className="section">
        <h3>탐구 방법 (단계)</h3>
        <ul>
          {design.methodSteps.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h3>기대 결과</h3>
        <p className="text-block">{design.expectedResults}</p>
      </div>

      <div className="section">
        <h3>확장 방향</h3>
        <p className="text-block">{design.extensionDirections}</p>
      </div>

      <div className="section">
        <h3>교과 연계</h3>
        <div className="chips">
          {design.subjects.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>과정 점검</h3>
        <ul>
          {design.processChecklist.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="section section--ethics">
        <h3>AI·출처·윤리</h3>
        <p className="text-block text-block--muted">{design.aiEthicsNote}</p>
      </div>

      <div className="section">
        <h3>세특·생기부 문장 초안 (참고)</h3>
        <p className="text-block">{design.recordSentence}</p>
        <p className="field-hint" style={{ marginTop: "0.5rem" }}>
          실제 기재는 학교 기재요령·교사 관찰에 따릅니다.
        </p>
      </div>

      <div className="design-result-item__copy-footer">
        <button type="button" className="btn-ghost" onClick={() => onCopy(`설계${n}`, exportBlock)}>
          복사
        </button>
      </div>
    </article>
  );
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
      <path
        d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"
        strokeLinejoin="round"
      />
      <path d="M5 19h14" strokeLinecap="round" />
    </svg>
  );
}

function IconSectionConstraints() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        strokeLinecap="round"
      />
      <path
        d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z"
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
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

type ChoiceBtnProps = {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
};

function ChoiceBtn({ active, children, onClick }: ChoiceBtnProps) {
  return (
    <button
      type="button"
      className={`choice-btn${active ? " choice-btn--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [step, setStep] = useState(1);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [courseCategory, setCourseCategory] = useState("");
  const [courseName, setCourseName] = useState("");
  const [major, setMajor] = useState("");
  const [grade, setGrade] = useState("고1");

  const [k1, setK1] = useState("");
  const [k2, setK2] = useState("");
  const [k3, setK3] = useState("");
  const [mbtiSelect, setMbtiSelect] = useState<string>("");
  const [mbtiCustom, setMbtiCustom] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [inquiryStyle, setInquiryStyle] = useState("");
  const [goalLevel, setGoalLevel] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [aiUsageLevel, setAiUsageLevel] = useState("");
  const [constraintPeriod, setConstraintPeriod] = useState("");
  const [constraintPlace, setConstraintPlace] = useState("");
  const [constraintTeam, setConstraintTeam] = useState("");
  const [constraintBudget, setConstraintBudget] = useState("");
  const [constraintsExtra, setConstraintsExtra] = useState("");
  const [perf, setPerf] = useState("");

  const [inquiryType, setInquiryType] = useState("");

  const [questions, setQuestions] = useState<string[] | null>(null);
  const [selectedQuestionIdxs, setSelectedQuestionIdxs] = useState<number[]>([]);
  const [designSourceQuestions, setDesignSourceQuestions] = useState<string[]>([]);
  const [designResults, setDesignResults] = useState<ExplorationDesign[]>([]);

  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [designLoading, setDesignLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const errorBannerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const mbtiResolved = useMemo(() => {
    if (mbtiSelect === MBTI_CUSTOM) return mbtiCustom;
    return mbtiSelect;
  }, [mbtiSelect, mbtiCustom]);

  const recommendLike: RecommendFormInput = useMemo(
    () => ({
      major,
      keywords: [k1.trim(), k2.trim(), k3.trim()] as [string, string, string],
      mbtiOrTrait: mbtiResolved,
      gradeLevel,
      performanceExperience: perf,
      constraintsExtra,
    }),
    [major, k1, k2, k3, mbtiResolved, gradeLevel, perf, constraintsExtra]
  );

  const courseNameOptions = useMemo(() => {
    if (!selectedSubject || selectedSubject === "기타" || !courseCategory) return [];
    return getCourseNames(
      selectedSubject as Exclude<SubjectGroupKey, "기타">,
      courseCategory as CourseCategory
    );
  }, [selectedSubject, courseCategory]);

  const explorationPayload = useCallback((): ExplorationPayload => {
    return {
      major: major.trim(),
      keywords: [k1.trim(), k2.trim(), k3.trim()] as [string, string, string],
      grade,
      mbtiOrTrait: mbtiResolved.trim(),
      gradeLevel: gradeLevel.trim(),
      performanceExperience: perf.trim(),
      inquiryStyle: inquiryStyle.trim(),
      constraintPeriod: constraintPeriod.trim(),
      constraintPlace: constraintPlace.trim(),
      constraintTeam: constraintTeam.trim(),
      constraintBudget: constraintBudget.trim(),
      constraintsExtra: constraintsExtra.trim() || undefined,
      selectedSubject,
      courseCategory: selectedSubject === "기타" ? undefined : courseCategory.trim() || undefined,
      courseName: courseName.trim() || undefined,
      inquiryType,
      goalLevel,
      outputFormat,
      aiUsageLevel,
    };
  }, [
    major,
    k1,
    k2,
    k3,
    grade,
    mbtiResolved,
    gradeLevel,
    perf,
    inquiryStyle,
    constraintPeriod,
    constraintPlace,
    constraintTeam,
    constraintBudget,
    constraintsExtra,
    selectedSubject,
    courseCategory,
    courseName,
    inquiryType,
    goalLevel,
    outputFormat,
    aiUsageLevel,
  ]);

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

  const resetFlow = useCallback(() => {
    setStep(1);
    setQuestions(null);
    setSelectedQuestionIdxs([]);
    setDesignSourceQuestions([]);
    setDesignResults([]);
    setError(null);
  }, []);

  useLayoutEffect(() => {
    if (!error) return;
    const el = errorBannerRef.current;
    if (!el) return;

    const scrollToBanner = () => {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    };

    scrollToBanner();
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBanner);
    });
    const t = window.setTimeout(scrollToBanner, 80);
    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(t);
    };
  }, [error]);

  useEffect(() => {
    if (step !== 5 || designResults.length === 0) return;
    const el = resultsRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus();
    });
  }, [step, designResults.length]);

  const validateFullExploration = useCallback((): string | null => {
    return validateExplorationForm({
      ...recommendLike,
      inquiryStyle,
      constraintPeriod,
      constraintPlace,
      constraintTeam,
      constraintBudget,
      selectedSubject,
      courseCategory,
      courseName,
      inquiryType,
      goalLevel,
      outputFormat,
      aiUsageLevel,
    });
  }, [
    recommendLike,
    inquiryStyle,
    constraintPeriod,
    constraintPlace,
    constraintTeam,
    constraintBudget,
    selectedSubject,
    courseCategory,
    courseName,
    inquiryType,
    goalLevel,
    outputFormat,
    aiUsageLevel,
  ]);

  const goNext = () => {
    setError(null);
    if (step === 1) {
      const err = validateExplorationStep1({
        selectedSubject,
        courseCategory,
        courseName,
        major,
        grade,
      });
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const err = validateExplorationStep2Full({
        ...recommendLike,
        inquiryStyle,
        constraintPeriod,
        constraintPlace,
        constraintTeam,
        constraintBudget,
        goalLevel,
        outputFormat,
        aiUsageLevel,
      });
      if (err) {
        setError(err);
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      const err = validateExplorationStep3(inquiryType);
      if (err) {
        setError(err);
        return;
      }
      setStep(4);
    }
  };

  const goBack = () => {
    setError(null);
    if (step <= 1) return;
    if (step === 4) {
      setQuestions(null);
      setSelectedQuestionIdxs([]);
    }
    if (step === 5) {
      setDesignResults([]);
      setDesignSourceQuestions([]);
    }
    setStep((s) => Math.max(1, s - 1));
  };

  const onGenerateQuestions = async () => {
    setError(null);
    const err = validateFullExploration();
    if (err) {
      setError(err);
      return;
    }
    setQuestionsLoading(true);
    setQuestions(null);
    setSelectedQuestionIdxs([]);
    logEvent("questions_click");
    try {
      const data = await fetchResearchQuestions(explorationPayload());
      setQuestions(data.questions);
      logEvent("questions_ok", { count: String(data.questions.length) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(msg);
      logEvent("questions_error", { message: msg });
    } finally {
      setQuestionsLoading(false);
    }
  };

  const toggleQuestionPick = useCallback(
    (idx: number) => {
      setSelectedQuestionIdxs((prev) => {
        if (prev.includes(idx)) return prev.filter((i) => i !== idx);
        if (prev.length >= MAX_EXPLORATION_QUESTION_PICKS) {
          showToast(`탐구 질문은 최대 ${MAX_EXPLORATION_QUESTION_PICKS}개까지 선택할 수 있습니다.`);
          return prev;
        }
        return [...prev, idx].sort((a, b) => a - b);
      });
    },
    [showToast]
  );

  const onGenerateDesign = async () => {
    if (!questions?.length) {
      setError("먼저 탐구 질문을 생성하세요.");
      return;
    }
    const pickedTexts = selectedQuestionIdxs
      .map((i) => questions[i]?.trim())
      .filter((q): q is string => Boolean(q));
    if (pickedTexts.length === 0) {
      setError("탐구 질문을 1개 이상 선택하세요.");
      return;
    }
    setError(null);
    const err = validateFullExploration();
    if (err) {
      setError(err);
      return;
    }
    setDesignLoading(true);
    logEvent("design_click", { picks: String(pickedTexts.length) });
    try {
      const data = await fetchExplorationDesign({
        ...explorationPayload(),
        selectedQuestions: pickedTexts,
      });
      if (data.designs.length !== pickedTexts.length) {
        throw new Error("서버 응답과 선택한 질문 수가 맞지 않습니다. 다시 시도해 주세요.");
      }
      setDesignSourceQuestions(pickedTexts);
      setDesignResults(data.designs);
      setStep(5);
      logEvent("design_ok", { count: String(data.designs.length) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(msg);
      logEvent("design_error", { message: msg });
    } finally {
      setDesignLoading(false);
    }
  };

  const loadingOverlay = questionsLoading || designLoading;

  const keywordPlaceholders = ["예: 뇌과학", "예: 데이터", "예: 사회문제"];

  return (
    <div className="app">
      <header className="app-topbar">
        <img src="/aicc-logo.png" alt="AICC" className="app-logo" width={120} height={48} />
        <div className="app-brand">
          <h1 className="app-brand__title">AI 탐구 주제 설계 도구</h1>
          <p className="app-brand__subtitle">2028 대입·고교학점제에 맞춰 교과·질문·탐구 설계를 단계적으로 안내합니다.</p>
        </div>
      </header>

      <nav className="step-wizard" aria-label="진행 단계">
        <ol className="step-wizard__list">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const current = step === n;
            return (
              <li key={label} className={`step-wizard__item${current ? " step-wizard__item--current" : ""}${done ? " step-wizard__item--done" : ""}`}>
                <span className="step-wizard__num" aria-hidden>
                  {done ? "✓" : n}
                </span>
                <span className="step-wizard__label">{label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

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
          <strong>
            본 서비스는 교과 기반 탐구·수행 계획을 설계할 때 참고하는 도구입니다. 입시 합격이나 내신 등급을 보장하지 않습니다.
          </strong>
        </p>
        <ul className="info-guide__list">
          <li>단계마다 교과·유형·목표 수준을 고르면, 질문 후보와 최종 설계의 깊이가 달라집니다.</li>
          <li>세특·생기부 문장은 참고 초안입니다. 실제 기재는 학교생활기록부 기재요령과 담임교사 관찰을 따릅니다.</li>
          <li>허위 작성이나 AI 결과를 검토 없이 제출하는 것은 수행평가·AI 활용 지침에 맞지 않을 수 있습니다.</li>
        </ul>
      </section>

      {toast && (
        <div className="alert alert--success" role="status" aria-live="polite">
          {toast}
        </div>
      )}
      {error && (
        <div
          id="form-error-banner"
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
        <div className={`form-stack ${loadingOverlay ? "form-stack--loading" : ""}`}>
          {step === 1 && (
            <section className="form-section" aria-labelledby="sec-s1">
              <div className="section-head">
                <span className="section-icon">
                  <IconSectionBasic />
                </span>
                <div>
                  <h2 id="sec-s1">STEP 1 — 교과·기본 정보</h2>
                  <p className="section-desc">
                    2022 개정 교육과정 기준으로 교과(군)·과목 분류·과목명을 고릅니다. 이후 탐구 설계에 반영됩니다.
                  </p>
                </div>
              </div>
              <div className="form-grid cols-2">
                <div className="field field--full">
                  <label className="field-label" htmlFor="subject">
                    교과(군)
                    <span className="badge-req">필수</span>
                  </label>
                  <select
                    id="subject"
                    className="text-like input-base"
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setCourseCategory("");
                      setCourseName("");
                    }}
                  >
                    <option value="">교과(군)을 선택하세요</option>
                    {SUBJECT_GROUP_KEYS.map((s) => (
                      <option key={s} value={s}>
                        {SUBJECT_GROUP_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <span className="field-hint">국·수·영·사·과는 표준 분류, 정보는 개정 과목 예시, 기타는 예체능·융합 등 직접 입력.</span>
                </div>

                {selectedSubject && selectedSubject !== "기타" && (
                  <>
                    <div className="field field--full">
                      <label className="field-label" htmlFor="course-category">
                        과목 분류
                        <span className="badge-req">필수</span>
                      </label>
                      <select
                        id="course-category"
                        className="text-like input-base"
                        value={courseCategory}
                        onChange={(e) => {
                          setCourseCategory(e.target.value);
                          setCourseName("");
                        }}
                      >
                        <option value="">공통·일반·진로·융합 중 선택</option>
                        {COURSE_CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field field--full">
                      <label className="field-label" htmlFor="course-name">
                        과목명
                        <span className="badge-req">필수</span>
                      </label>
                      <select
                        id="course-name"
                        className="text-like input-base"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        disabled={!courseCategory}
                      >
                        <option value="">과목명 선택</option>
                        {courseNameOptions.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <span className="field-hint">
                        학교 개설 과목명이 다르면 가장 가까운 항목을 선택하세요.
                      </span>
                    </div>
                  </>
                )}

                {selectedSubject === "기타" && (
                  <div className="field field--full">
                    <label className="field-label" htmlFor="course-name-other">
                      세부 교과·과목명
                      <span className="badge-req">필수</span>
                    </label>
                    <input
                      id="course-name-other"
                      className="input-base"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="예: 미술, 음악, 체육, 융합 교과 등"
                      maxLength={100}
                      autoComplete="off"
                    />
                  </div>
                )}

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
                    {SCHOOL_GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <>
              <section className="form-section" aria-labelledby="sec-s2a">
                <div className="section-head">
                  <span className="section-icon">
                    <IconSectionInterest />
                  </span>
                  <div>
                    <h2 id="sec-s2a">STEP 2 — 관심·성향·AI 활용</h2>
                    <p className="section-desc">키워드와 목표 깊이, 결과 형태를 정하면 이후 질문과 설계가 구체화됩니다.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label className="field-label">
                      관심 키워드 3개
                      <span className="badge-req">필수</span>
                    </label>
                    <span className="field-hint" style={{ marginTop: 0 }}>
                      각 칸마다 1글자 이상, 짧은 키워드로 입력하세요.
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
                        <span className="badge-req">필수</span>
                      </label>
                      <select
                        id="mbti"
                        className="text-like input-base"
                        value={mbtiSelect}
                        onChange={(e) => setMbtiSelect(e.target.value)}
                      >
                        <option value="">MBTI·성향을 선택하세요</option>
                        {MBTI_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        <option value={MBTI_CUSTOM}>기타 (직접 입력)</option>
                      </select>
                      {mbtiSelect === MBTI_CUSTOM && (
                        <input
                          className="input-base"
                          style={{ marginTop: "0.55rem" }}
                          type="text"
                          value={mbtiCustom}
                          onChange={(e) => setMbtiCustom(e.target.value)}
                          placeholder="예: 계획형, 사람 중심"
                          maxLength={100}
                          autoComplete="off"
                        />
                      )}
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="gradeLevel">
                        내신 수준
                        <span className="badge-req">필수</span>
                      </label>
                      <select
                        id="gradeLevel"
                        className="text-like input-base"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                      >
                        <option value="">내신 수준을 선택하세요</option>
                        {GRADE_LEVEL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="field field--full">
                    <label className="field-label" htmlFor="inquiryStyle">
                      희망 탐구 방식
                      <span className="badge-req">필수</span>
                    </label>
                    <select
                      id="inquiryStyle"
                      className="text-like input-base"
                      value={inquiryStyle}
                      onChange={(e) => setInquiryStyle(e.target.value)}
                    >
                      <option value="">희망 탐구 방식을 선택하세요</option>
                      {INQUIRY_STYLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field field--full">
                    <span className="field-label">
                      탐구 목표 수준
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid" role="group" aria-label="탐구 목표 수준">
                      {GOAL_LEVELS.map((g) => (
                        <ChoiceBtn
                          key={g}
                          active={goalLevel === g}
                          onClick={() => setGoalLevel(goalLevel === g ? "" : g)}
                        >
                          {g}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      결과 형태
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid" role="group" aria-label="결과 형태">
                      {OUTPUT_FORMATS.map((f) => (
                        <ChoiceBtn
                          key={f}
                          active={outputFormat === f}
                          onClick={() => setOutputFormat(outputFormat === f ? "" : f)}
                        >
                          {f}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      AI 활용 수준
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--ai" role="group" aria-label="AI 활용 수준">
                      {AI_USAGE_LEVELS.map((a) => (
                        <ChoiceBtn
                          key={a}
                          active={aiUsageLevel === a}
                          onClick={() => setAiUsageLevel(aiUsageLevel === a ? "" : a)}
                        >
                          {a}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="form-section" aria-labelledby="sec-s2b">
                <div className="section-head">
                  <span className="section-icon">
                    <IconSectionConstraints />
                  </span>
                  <div>
                    <h2 id="sec-s2b">탐구 조건</h2>
                    <p className="section-desc">기간·장소·진행·비용을 정하면 탐구안이 수행 환경에 맞게 제안됩니다.</p>
                  </div>
                </div>
                <div className="constraint-blocks">
                  <div className="field field--full">
                    <span className="field-label">
                      기간
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--dense">
                      {CONSTRAINT_PERIOD_OPTIONS.map((o) => (
                        <ChoiceBtn
                          key={o.value}
                          active={constraintPeriod === o.value}
                          onClick={() =>
                            setConstraintPeriod(constraintPeriod === o.value ? "" : o.value)
                          }
                        >
                          {o.label}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      장소·환경
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--dense">
                      {CONSTRAINT_PLACE_OPTIONS.map((o) => (
                        <ChoiceBtn
                          key={o.value}
                          active={constraintPlace === o.value}
                          onClick={() =>
                            setConstraintPlace(constraintPlace === o.value ? "" : o.value)
                          }
                        >
                          {o.label}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      진행 방식
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--dense">
                      {CONSTRAINT_TEAM_OPTIONS.map((o) => (
                        <ChoiceBtn
                          key={o.value}
                          active={constraintTeam === o.value}
                          onClick={() =>
                            setConstraintTeam(constraintTeam === o.value ? "" : o.value)
                          }
                        >
                          {o.label}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <span className="field-label">
                      비용·재료
                      <span className="badge-req">필수</span>
                    </span>
                    <div className="choice-grid choice-grid--dense">
                      {CONSTRAINT_BUDGET_OPTIONS.map((o) => (
                        <ChoiceBtn
                          key={o.value}
                          active={constraintBudget === o.value}
                          onClick={() =>
                            setConstraintBudget(constraintBudget === o.value ? "" : o.value)
                          }
                        >
                          {o.label}
                        </ChoiceBtn>
                      ))}
                    </div>
                  </div>
                  <div className="field field--full">
                    <label className="field-label" htmlFor="constraintsExtra">
                      기타 한 줄
                      <span className="badge-opt">선택</span>
                    </label>
                    <input
                      id="constraintsExtra"
                      className="input-base"
                      type="text"
                      value={constraintsExtra}
                      onChange={(e) => setConstraintsExtra(e.target.value)}
                      placeholder="예: 주말만 가능"
                      maxLength={120}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </section>

              <section className="form-section" aria-labelledby="sec-s2c">
                <div className="section-head">
                  <span className="section-icon">
                    <IconSectionExperience />
                  </span>
                  <div>
                    <h2 id="sec-s2c">경험</h2>
                    <p className="section-desc">이전 수행·탐구 경험을 적어 주세요.</p>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="perf">
                    수행평가·탐구 경험
                    <span className="badge-req">필수</span>
                  </label>
                  <textarea
                    id="perf"
                    className="input-base"
                    value={perf}
                    onChange={(e) => setPerf(e.target.value)}
                    placeholder="5글자 이상, 예: 과학 수행에서 실험 설계·보고서 작성 등"
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </section>
            </>
          )}

          {step === 3 && (
            <section className="form-section" aria-labelledby="sec-s3">
              <div className="section-head">
                <span className="section-icon">
                  <IconSectionInterest />
                </span>
                <div>
                  <h2 id="sec-s3">STEP 3 — 탐구 유형</h2>
                  <p className="section-desc">같은 교과라도 유형에 따라 질문과 설계 결과가 달라집니다.</p>
                </div>
              </div>
              <div className="choice-grid choice-grid--types" role="group" aria-label="탐구 유형">
                {INQUIRY_TYPES.map((t) => (
                  <ChoiceBtn
                    key={t}
                    active={inquiryType === t}
                    onClick={() => setInquiryType(inquiryType === t ? "" : t)}
                  >
                    {t}
                  </ChoiceBtn>
                ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="form-section" aria-labelledby="sec-s4">
              <div className="section-head">
                <span className="section-icon">
                  <IconSectionBasic />
                </span>
                <div>
                  <h2 id="sec-s4">STEP 4 — 탐구 질문 생성·선택</h2>
                  <p className="section-desc">
                    후보 질문을 만든 뒤, 원하는 만큼 고르면 질문마다 각각 다른 탐구 활동 설계가 만들어집니다. 예를 들어 5개를 고르면 설계 카드가 5개 나옵니다.
                  </p>
                </div>
              </div>
              <p className="step4-pick-hint" role="note">
                질문은 1개 이상, 최대 {MAX_EXPLORATION_QUESTION_PICKS}개까지 선택할 수 있습니다. 카드를 눌러 넣었다 뺄 수 있습니다.
              </p>
              <div className="step4-actions">
                <button type="button" className="btn-cta btn-cta--secondary" onClick={onGenerateQuestions} disabled={questionsLoading}>
                  {questionsLoading ? "질문 생성 중…" : "탐구 질문 3~5개 생성"}
                </button>
              </div>
              {questions && questions.length > 0 && (
                <>
                  <p className="step4-pick-count" aria-live="polite">
                    현재 <strong>{selectedQuestionIdxs.length}</strong>개 선택됨
                    {selectedQuestionIdxs.length >= MAX_EXPLORATION_QUESTION_PICKS ? " (최대)" : ""}
                  </p>
                  <ul className="question-card-list">
                    {questions.map((q, idx) => {
                      const picked = selectedQuestionIdxs.includes(idx);
                      return (
                        <li key={idx}>
                          <article className={`question-card${picked ? " question-card--selected" : ""}`}>
                            <p className="question-card__text">{q}</p>
                            <button
                              type="button"
                              className={picked ? "btn-pick btn-pick--active" : "btn-pick"}
                              aria-pressed={picked}
                              onClick={() => toggleQuestionPick(idx)}
                            >
                              {picked ? "선택 해제" : "선택하기"}
                            </button>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {questions && (
                <div className="step4-actions step4-actions--bottom">
                  <button
                    type="button"
                    className="btn-cta"
                    onClick={onGenerateDesign}
                    disabled={designLoading || selectedQuestionIdxs.length === 0}
                  >
                    {designLoading
                      ? "설계 생성 중…"
                      : selectedQuestionIdxs.length > 1
                        ? `선택한 ${selectedQuestionIdxs.length}개 질문 각각 — 탐구 설계 생성`
                        : "선택한 질문으로 탐구 설계 생성"}
                  </button>
                </div>
              )}
            </section>
          )}

          {step === 5 && designResults.length > 0 && (
            <div
              ref={resultsRef}
              tabIndex={-1}
              className="results-block"
              aria-label="탐구 설계 결과"
            >
              <h2 className="results-title">
                STEP 5 — 탐구 설계 결과 ({designResults.length}건)
              </h2>
              {designSourceQuestions.length > 0 && (
                <div className="selected-questions-summary" aria-labelledby="picked-questions-title">
                  <h3 id="picked-questions-title" className="results-subheading">
                    선택한 탐구 질문 ({designSourceQuestions.length}개)
                  </h3>
                  <p className="selected-questions-summary__lead">
                    아래 카드는 위 목록과 같은 순서입니다. 질문마다 별도의 탐구 활동 설계입니다.
                  </p>
                  <ol className="selected-questions-list">
                    {designSourceQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="design-results-stack">
                {designResults.map((d, i) => (
                  <DesignResultCard
                    key={i}
                    design={d}
                    index={i}
                    sourceQuestion={designSourceQuestions[i] ?? ""}
                    onCopy={onCopy}
                  />
                ))}
              </div>
              <div className="copy-all-wrap copy-all-wrap--results-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onCopy("전체", formatAllDesignsBlock(designSourceQuestions, designResults))}
                >
                  전체 설계 복사
                </button>
                <button type="button" className="btn-secondary" onClick={resetFlow}>
                  처음부터 다시
                </button>
              </div>
            </div>
          )}

          {step < 5 && (
            <div className={`wizard-nav${step === 1 ? " wizard-nav--first" : ""}`}>
              {step > 1 && (
                <button type="button" className="btn-secondary btn-wizard-back" onClick={goBack}>
                  이전
                </button>
              )}
              {step < 4 && (
                <button type="button" className="btn-cta btn-cta--nav" onClick={goNext}>
                  다음 단계
                </button>
              )}
            </div>
          )}
        </div>

        {loadingOverlay && (
          <div className="form-loading-overlay" role="status" aria-live="polite" aria-label="생성 중">
            <div className="form-loading-inner">
              <span className="form-loading-spinner" aria-hidden />
              <p className="form-loading-text">
                {designLoading
                  ? selectedQuestionIdxs.length > 1
                    ? `선택한 ${selectedQuestionIdxs.length}개 질문 각각에 대해 탐구 설계를 작성하는 중입니다…`
                    : "탐구 설계를 작성하는 중입니다…"
                  : "탐구 질문을 만드는 중입니다…"}
              </p>
              <p className="form-loading-hint">
                {designLoading && selectedQuestionIdxs.length > 1
                  ? "질문 수만큼 생성하므로 다소 시간이 걸릴 수 있습니다."
                  : "보통 수십 초 이내에 완료됩니다."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
