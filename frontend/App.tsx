import React, {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import LoginPage from "./login/LoginPage";

/* =========================================================
   TYPES
========================================================= */

type Page =
  | "dashboard"
  | "verification"
  | "preview"
  | "screening"
  | "results"
  | "cases"
  | "history"
  | "review"
  | "reports"
  | "settings";

type DocumentType = "Aadhar Card" | "Passport";

export interface ScreeningResult {
  documentType?: string;
  fileName?: string;
  ocr?: Record<string, any>;
  validation?: Record<string, any>;
  tampering?: Record<string, any>;
  face?: Record<string, any>;
  documentRiskScore?: number;
  riskScore?: number;
  riskLevel?: string;
  screeningOutcome?: string;
  decisionBasis?: Record<string, any>;
  [key: string]: any;
}

interface CaseRecord {
  id: string;
  createdAt: string;
  documentType: string;
  fileName: string;
  applicantName: string;
  riskScore: number;
  riskLevel: string;
  outcome: string;
  result: ScreeningResult;
}

interface FormState {
  documentType: DocumentType;
  frontFile: File | null;
  backFile: File | null;
  referenceFile: File | null;
}

/* =========================================================
   CONSTANTS
========================================================= */

const API_BASE = "http://localhost:8000";

const NAV_ITEMS: {
  id: Page;
  label: string;
  icon: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "verification", label: "New Verification", icon: "⊕" },
  { id: "cases", label: "Cases", icon: "▣" },
  { id: "history", label: "Verification History", icon: "◷" },
  { id: "review", label: "Secondary Review", icon: "⌕" },
  { id: "reports", label: "Reports", icon: "▤" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

/* =========================================================
   SMALL HELPERS
========================================================= */

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateString;
  }
}

function getApplicantName(result: ScreeningResult): string {
  const ocr = result?.ocr || {};

  const possibleNames = [
    ocr.name,
    ocr.Name,
    ocr["Name"],
    ocr["Elector's Name"],
    ocr["First Name"],
    ocr.fullName,
    ocr["Full Name"],
    ocr.surname && ocr.name
      ? `${ocr.name} ${ocr.surname}`
      : "",
  ];

  const value = possibleNames.find(
    (item) =>
      typeof item === "string" &&
      item.trim().length > 0
  );

  return value ? value.trim() : "Unknown Applicant";
}

function getRiskScore(result: ScreeningResult): number {
  const value =
    result.documentRiskScore ??
    result.riskScore ??
    0;

  const numeric = Number(value);

  if (Number.isNaN(numeric)) return 0;

  return Math.round(
    Math.max(0, Math.min(100, numeric))
  );
}

function getRiskLevel(
  result: ScreeningResult
): string {
  const score = getRiskScore(result);

  if (score < 40) return "Genuine Document";
  if (score <= 75) return "Suspected Document";
  return "Risky Document";
}

function getOutcome(
  result: ScreeningResult
): string {
  const score = getRiskScore(result);

  if (score < 40) {
    return "Genuine Document";
  }

  if (score <= 75) {
    return "Suspected Document, Review Required";
  }

  return "Risky Document, Review Required";
}

function getDocumentStatusTone(score: number) {
  if (score < 40) return "green";
  if (score <= 75) return "amber";
  return "red";
}

function getFaceMatchTone(score: number) {
  if (score >= 75) return "green";
  if (score >= 40) return "amber";
  return "red";
}

function getFaceMatchLabel(score: number) {
  if (score >= 75) return "Genuine Face Match";
  if (score >= 40) return "Suspected Match, Review Required";
  return "Risky Match, Review Required";
}

function createCase(
  result: ScreeningResult,
  form: FormState
): CaseRecord {
  const score = getRiskScore(result);

  return {
    id:
      "SSB-" +
      Date.now().toString().slice(-8),
    createdAt: new Date().toISOString(),
    documentType:
      result.documentType ||
      form.documentType,
    fileName:
      result.fileName ||
      form.frontFile?.name ||
      "Document",
    applicantName: getApplicantName(result),
    riskScore: score,
    riskLevel: getRiskLevel(result),
    outcome: getOutcome(result),
    result,
  };
}

/* =========================================================
   ICON
========================================================= */

function Icon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    case "cases":
      return (
        <svg {...common}>
          <path d="M3 7h18" />
          <path d="M5 7V5a2 2 0 0 1 2-2h3l2 2h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
        </svg>
      );

    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "review":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
          <path d="M8 11h6" />
        </svg>
      );

    case "reports":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 5h13l3 3v11H4" />
          <path d="M8 15v-3" />
          <path d="M12 15V9" />
          <path d="M16 15v-5" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.6-1H6v-2.4h.8a1.7 1.7 0 0 0 1.6-1A1.7 1.7 0 0 0 8.1 9L8 8.9 9.7 7.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.1h2.4V6a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "upload":
      return (
        <svg {...common}>
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
      );

    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );

    case "back":
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "warning":
      return (
        <svg {...common}>
          <path d="m12 3 10 18H2z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    default:
      return null;
  }
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  const [page, setPage] =
    useState<Page>("dashboard");

  const [officerName, setOfficerName] =
    useState("");

  const [officerId, setOfficerId] =
    useState("SSB-0019");

  const [cases, setCases] = useState<
    CaseRecord[]
  >([]);

  const [selectedCase, setSelectedCase] =
    useState<CaseRecord | null>(null);

  const [form, setForm] = useState<FormState>({
    documentType: "Passport",
    frontFile: null,
    backFile: null,
    referenceFile: null,
  });

  const [screeningResult, setScreeningResult] =
    useState<ScreeningResult | null>(null);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [screeningProgress, setScreeningProgress] =
    useState(0);

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigate = (nextPage: Page) => {
    setError("");
    setPage(nextPage);
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = () => {
    // Session-only requirement:
    // clear all case/screening state.
    setCases([]);
    setSelectedCase(null);
    setScreeningResult(null);
    setForm({
      documentType: "Passport",
      frontFile: null,
      backFile: null,
      referenceFile: null,
    });
    setOfficerName("");
    setIsLoggedIn(false);
    setPage("dashboard");
  };

  /* =======================================================
     FILE HANDLING
  ======================================================= */

  const setFile = (
    type: "frontFile" | "backFile" | "referenceFile",
    file: File | null
  ) => {
    if (!file) return;

    setForm((previous) => ({
      ...previous,
      [type]: file,
    }));

    setError("");
  };

  const handleFileInput = (
    event: ChangeEvent<HTMLInputElement>,
    type:
      | "frontFile"
      | "backFile"
      | "referenceFile"
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      setFile(type, file);
    }
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    type:
      | "frontFile"
      | "backFile"
      | "referenceFile"
  ) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      setFile(type, file);
    }
  };

  /* =======================================================
     DOCUMENT TYPE CHANGE
  ======================================================= */

  const changeDocumentType = (
    type: DocumentType
  ) => {
    setForm((previous) => ({
      ...previous,
      documentType: type,
      frontFile: null,
      backFile: null,
    }));

    setError("");
  };

  /* =======================================================
     START VERIFICATION
  ======================================================= */

  const startVerification = () => {
    setError("");

    if (!form.frontFile) {
      setError(
        "Please upload the document image before continuing."
      );
      return;
    }

    setPage("preview");
  };

  /* =======================================================
     SCREENING
  ======================================================= */

  const runScreening = async () => {
    if (!form.frontFile) {
      setError("Document image is missing.");
      return;
    }

    setError("");
    setScreeningProgress(10);
    setPage("screening");

    try {
      const formData = new FormData();

      /*
       * IMPORTANT:
       * These names must match FastAPI:
       *
       * document
       * document_type
       * reference_image
       */

      formData.append(
        "document",
        form.frontFile
      );

      formData.append(
        "document_type",
        form.documentType
      );

      if (form.backFile) {
        formData.append(
          "back_document",
          form.backFile
        );
      }

      if (form.referenceFile) {
        formData.append(
          "reference_image",
          form.referenceFile
        );
      }

      setScreeningProgress(25);

      const response = await fetch(
        `${API_BASE}/api/screening/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      setScreeningProgress(65);

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const detail =
          data?.detail ||
          `Server returned HTTP ${response.status}`;

        throw new Error(
          typeof detail === "string"
            ? detail
            : JSON.stringify(detail)
        );
      }

      setScreeningProgress(90);

      const normalizedResult: ScreeningResult =
        data || {};

      setScreeningResult(
        normalizedResult
      );

      const newCase = createCase(
        normalizedResult,
        form
      );

      setCases((previous) => [
        newCase,
        ...previous,
      ]);

      setSelectedCase(newCase);

      setScreeningProgress(100);

      setTimeout(() => {
        setPage("results");
      }, 500);
    } catch (err: any) {
      console.error(
        "Screening request failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to connect to the screening backend."
      );

      setScreeningProgress(0);
      setPage("preview");
    }
  };

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredCases = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) return cases;

    return cases.filter((item) =>
      [
        item.id,
        item.documentType,
        item.fileName,
        item.applicantName,
        item.riskLevel,
        item.outcome,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [cases, search]);

  /* =======================================================
     DASHBOARD STATISTICS
  ======================================================= */

  const statistics = useMemo(() => {
    const total = cases.length;

    const verified = cases.filter(
      (item) =>
        item.outcome
          .toLowerCase()
          .includes("verified") ||
        item.outcome
          .toLowerCase()
          .includes("approved")
    ).length;

    const highRisk = cases.filter(
      (item) =>
        item.riskLevel
          .toLowerCase()
          .includes("high")
    ).length;

    const pending =
      total - verified - highRisk >= 0
        ? total - verified - highRisk
        : 0;

    return {
      total,
      verified,
      pending,
      highRisk,
    };
  }, [cases]);

  /* =======================================================
     LOGIN SCREEN
  ======================================================= */

  const handleLogin = (
    username: string,
    password: string
  ): boolean => {
    if (
      username.trim() !== "Shivang" ||
      password !== "123@sc"
    ) {
      return false;
    }

    const trimmedUsername = username.trim();

    setOfficerName(trimmedUsername);
    setOfficerId("SSB-0019");
    setIsLoggedIn(true);
    setPage("dashboard");
    return true;
  };

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={handleLogin}
      />
    );
  }

  /* =======================================================
     MAIN APPLICATION
  ======================================================= */

  return (
    <div className="app-shell">
      <style>{APP_CSS}</style>

      <Sidebar
        page={page}
        navigate={navigate}
        logout={logout}
        officerName={officerName}
        officerId={officerId}
      />

      <div className="main-shell">
        <Header
          page={page}
          search={search}
          setSearch={setSearch}
          logout={logout}
        />

        <main className="main-content">
          {page === "dashboard" && (
            <DashboardPage
              statistics={statistics}
              cases={filteredCases}
              navigate={navigate}
              selectCase={(item) => {
                setSelectedCase(item);
                setScreeningResult(
                  item.result
                );
                setPage("results");
              }}
            />
          )}

          {page === "verification" && (
            <VerificationPage
              form={form}
              changeDocumentType={
                changeDocumentType
              }
              handleFileInput={
                handleFileInput
              }
              handleDrop={handleDrop}
              startVerification={
                startVerification
              }
              error={error}
            />
          )}

          {page === "preview" && (
            <PreviewPage
              form={form}
              setFile={setFile}
              handleFileInput={
                handleFileInput
              }
              handleDrop={handleDrop}
              onBack={() =>
                setPage("verification")
              }
              onStart={runScreening}
              error={error}
            />
          )}

          {page === "screening" && (
            <ScreeningPage
              progress={screeningProgress}
              documentType={
                form.documentType
              }
            />
          )}

          {page === "results" && (
            <ResultsPage
              result={screeningResult}
              caseRecord={selectedCase}
              navigate={navigate}
            />
          )}

          {page === "cases" && (
            <CasesPage
              cases={filteredCases}
              search={search}
              selectCase={(item) => {
                setSelectedCase(item);
                setScreeningResult(
                  item.result
                );
                setPage("results");
              }}
              navigate={navigate}
            />
          )}

          {page === "history" && (
            <HistoryPage
              cases={filteredCases}
              selectCase={(item) => {
                setSelectedCase(item);
                setScreeningResult(
                  item.result
                );
                setPage("results");
              }}
            />
          )}

          {page === "review" && (
            <ReviewPage
              cases={cases}
              selectCase={(item) => {
                setSelectedCase(item);
                setScreeningResult(
                  item.result
                );
                setPage("results");
              }}
            />
          )}

          {page === "reports" && (
            <ReportsPage
              cases={cases}
              statistics={statistics}
            />
          )}

          {page === "settings" && (
            <SettingsPage />
          )}
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function LoginScreen({
  onLogin,
}: {
  onLogin: () => void;
}) {
  const [officerId, setOfficerId] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const submit = (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!officerId || !password) {
      setError(
        "Enter Officer ID and password."
      );
      return;
    }

    /*
     * Prototype authentication.
     *
     * If /api/login is implemented later,
     * this can be replaced with a backend
     * authentication request.
     */

    onLogin();
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-shield">
            <Icon
              name="shield"
              size={30}
            />
          </div>

          <h1>
            Border Document
            <br />
            Screening System
          </h1>

          <p>
            Secure Document Verification
            Portal
          </p>
        </div>

        <form
          className="login-body"
          onSubmit={submit}
        >
          <h2>Officer Login</h2>

          <label>Officer ID</label>

          <input
            value={officerId}
            onChange={(e) =>
              setOfficerId(e.target.value)
            }
            placeholder="SSB-0019"
          />

          <label>Password</label>

          <div className="password-wrap">
            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter password"
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="login-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              Remember me
            </label>

            <button
              type="button"
              className="link-button"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            className="primary-button full"
            type="submit"
          >
            Login to System
          </button>

          <div className="security-notice">
            <Icon
              name="warning"
              size={20}
            />

            <span>
              <strong>
                Security Notice:
              </strong>{" "}
              This system is for authorized
              SSB personnel only. Unauthorized
              access is a criminal offence.
              All activities are logged and
              monitored.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({
  page,
  navigate,
  logout,
  officerName,
  officerId,
}: {
  page: Page;
  navigate: (page: Page) => void;
  logout: () => void;
  officerName: string;
  officerId: string;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Icon
            name="shield"
            size={23}
          />
        </div>

        <div>
          <div className="brand-name">
            Border Screening
          </div>

          <div className="brand-version">
            System v2.1
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active =
            page === item.id ||
            (item.id ===
              "verification" &&
              [
                "preview",
                "screening",
              ].includes(page)) ||
            (item.id === "cases" &&
              page === "results");

          return (
            <button
              key={item.id}
              className={
                active
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                navigate(item.id)
              }
            >
              <Icon
                name={item.id}
                size={18}
              />

              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="profile">
          <div className="profile-info">
            <strong>
              {officerName}
            </strong>

            <span>
              Officer ID: {officerId}
            </span>
          </div>
        </div>

        <button
          className="sidebar-logout"
          onClick={logout}
        >
          <Icon
            name="logout"
            size={17}
          />
          Logout
        </button>
      </div>
    </aside>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header({
  page,
  search,
  setSearch,
  logout,
}: {
  page: Page;
  search: string;
  setSearch: (value: string) => void;
  logout: () => void;
}) {
  const titles: Record<
    Page,
    string
  > = {
    dashboard: "Screening Dashboard",
    verification:
      "New Document Verification",
    preview: "Document Preview",
    screening: "AI Screening",
    results: "Screening Results",
    cases: "Verification Cases",
    history: "Verification History",
    review: "Secondary Review",
    reports: "Reports",
    settings: "Settings",
  };

  return (
    <header className="top-header">
      <div className="header-title">
        <strong>
          {titles[page]}
        </strong>

        <span className="online-badge">
          <span />
          System Online
        </span>
      </div>

      <div className="header-actions">
        <div className="search-box">
          <Icon
            name="search"
            size={17}
          />

          <input
            placeholder="Search cases..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <button className="icon-button">
          <Icon
            name="bell"
            size={18}
          />
        </button>

        <button
          className="logout-button"
          onClick={logout}
        >
          <Icon
            name="logout"
            size={16}
          />
          Logout
        </button>
      </div>
    </header>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function DashboardPage({
  statistics,
  cases,
  navigate,
  selectCase,
}: {
  statistics: {
    total: number;
    verified: number;
    pending: number;
    highRisk: number;
  };
  cases: CaseRecord[];
  navigate: (page: Page) => void;
  selectCase: (item: CaseRecord) => void;
}) {
  return (
    <div>
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">
            BORDER DOCUMENT SCREENING
          </div>

          <h1>
            Screening Dashboard
          </h1>

          <p>
            Welcome back, Officer
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() =>
            navigate("verification")
          }
        >
          <Icon
            name="plus"
            size={18}
          />
          New Document Verification
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Cases"
          value={statistics.total}
          tone="blue"
        />

        <StatCard
          title="Verified"
          value={statistics.verified}
          tone="green"
        />

        <StatCard
          title="Pending Review"
          value={statistics.pending}
          tone="amber"
        />

        <StatCard
          title="High Risk"
          value={statistics.highRisk}
          tone="red"
        />
      </div>

      <div className="content-card">
        <div className="card-header">
          <div>
            <h2>
              Recent Verification Cases
            </h2>

            <p>
              Latest documents screened
              during this session.
            </p>
          </div>

          {cases.length > 0 && (
            <button
              className="secondary-button"
              onClick={() =>
                navigate("cases")
              }
            >
              View All
            </button>
          )}
        </div>

        {cases.length === 0 ? (
          <EmptyState
            onStart={() =>
              navigate("verification")
            }
          />
        ) : (
          <CaseTable
            cases={cases.slice(0, 5)}
            selectCase={selectCase}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone:
    | "blue"
    | "green"
    | "amber"
    | "red";
}) {
  return (
    <div
      className={`stat-card ${tone}`}
    >
      <div className="stat-label">
        {title}
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-small">
        Current session
      </div>
    </div>
  );
}

/* =========================================================
   VERIFICATION PAGE
========================================================= */

function VerificationPage({
  form,
  changeDocumentType,
  handleFileInput,
  handleDrop,
  startVerification,
  error,
}: {
  form: FormState;
  changeDocumentType: (
    type: DocumentType
  ) => void;
  handleFileInput: (
    event: ChangeEvent<HTMLInputElement>,
    type:
      | "frontFile"
      | "backFile"
      | "referenceFile"
  ) => void;
  handleDrop: (
    event: DragEvent<HTMLDivElement>,
    type:
      | "frontFile"
      | "backFile"
      | "referenceFile"
  ) => void;
  startVerification: () => void;
  error: string;
}) {
  const needsBack =
    form.documentType === "Aadhar Card";

  return (
    <div>
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">
            NEW VERIFICATION
          </div>

          <h1>
            New Document Verification
          </h1>

          <p>
            Upload the document and reference
            image for AI screening.
          </p>
        </div>
      </div>

      <div className="workflow-card">
        <div className="workflow-step active">
          <span>1</span>
          Document
        </div>

        <div className="workflow-line" />

        <div className="workflow-step">
          <span>2</span>
          Preview
        </div>

        <div className="workflow-line" />

        <div className="workflow-step">
          <span>3</span>
          Screening
        </div>

        <div className="workflow-line" />

        <div className="workflow-step">
          <span>4</span>
          Result
        </div>
      </div>

      <div className="content-card">
        <div className="section-title">
          <h2>Document Type</h2>

          <p>
            Select the document being
            screened.
          </p>
        </div>

        <div className="document-type-grid">
          {(
            [
              "Passport",
              "Aadhar Card",
            ] as DocumentType[]
          ).map((type) => (
            <button
              key={type}
              className={
                form.documentType === type
                  ? "document-type selected"
                  : "document-type"
              }
              onClick={() =>
                changeDocumentType(type)
              }
            >
              <Icon
                name="file"
                size={22}
              />

              <strong>{type}</strong>

              <span>
                {type ===
                  "Passport"
                  ? "Primary document image"
                  : "Front + back supported"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="upload-grid">
        <UploadBox
          title={
            form.documentType ===
            "Passport"
              ? "Passport Image"
              : "Front Side"
          }
          description="Upload a clear document image."
          file={form.frontFile}
          onChange={(event) =>
            handleFileInput(
              event,
              "frontFile"
            )
          }
          onDrop={(event) =>
            handleDrop(
              event,
              "frontFile"
            )
          }
          required
        />

        {needsBack && (
          <UploadBox
            title="Back Side"
            description="Required for complete document screening."
            file={form.backFile}
            onChange={(event) =>
              handleFileInput(
                event,
                "backFile"
              )
            }
            onDrop={(event) =>
              handleDrop(
                event,
                "backFile"
              )
            }
          />
        )}

        <UploadBox
          title="Reference Image"
          description="Photo/reference image used for identity comparison."
          file={form.referenceFile}
          onChange={(event) =>
            handleFileInput(
              event,
              "referenceFile"
            )
          }
          onDrop={(event) =>
            handleDrop(
              event,
              "referenceFile"
            )
          }
        />
      </div>

      <div className="info-box">
        <Icon
          name="shield"
          size={20}
        />

        <div>
          <strong>
            Reference image
          </strong>

          <p>
            Upload a clear photograph of
            the person. It is sent to the
            backend as{" "}
            <code>
              reference_image
            </code>{" "}
            for the independent face
            verification stage.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box large">
          <Icon
            name="warning"
            size={18}
          />
          {error}
        </div>
      )}

      <div className="action-bar">
        <button
          className="secondary-button"
          onClick={() =>
            window.location.reload()
          }
        >
          Cancel
        </button>

        <button
          className="primary-button"
          onClick={startVerification}
        >
          Continue to Preview
          <Icon
            name="arrow"
            size={17}
          />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   UPLOAD BOX
========================================================= */

function UploadBox({
  title,
  description,
  file,
  onChange,
  onDrop,
  required,
}: {
  title: string;
  description: string;
  file: File | null;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onDrop: (
    event: DragEvent<HTMLDivElement>
  ) => void;
  required?: boolean;
}) {
  return (
    <div className="upload-box">
      <div className="upload-box-title">
        <strong>
          {title}
        </strong>

        {required && (
          <span className="required">
            Required
          </span>
        )}
      </div>

      <div
        className={
          file
            ? "drop-zone has-file"
            : "drop-zone"
        }
        onDragOver={(e) =>
          e.preventDefault()
        }
        onDrop={onDrop}
      >
        {file ? (
          <>
            <div className="uploaded-file-icon">
              <Icon
                name="file"
                size={24}
              />
            </div>

            <strong>
              {file.name}
            </strong>

            <span>
              {(
                file.size /
                1024 /
                1024
              ).toFixed(2)}{" "}
              MB
            </span>
          </>
        ) : (
          <>
            <div className="upload-icon">
              <Icon
                name="upload"
                size={26}
              />
            </div>

            <strong>
              Drag & drop image here
            </strong>

            <span>
              JPG, JPEG, PNG or supported
              image
            </span>
          </>
        )}

        <label className="browse-button">
          {file
            ? "Replace File"
            : "Browse Files"}

          <input
            type="file"
            accept="image/*"
            onChange={onChange}
            hidden
          />
        </label>
      </div>

      <p className="upload-description">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   PREVIEW
========================================================= */

function PreviewPage({
  form,
  handleFileInput,
  handleDrop,
  onBack,
  onStart,
  error,
}: {
  form: FormState;
  setFile: (
    type:
      | "frontFile"
      | "backFile"
      | "referenceFile",
    file: File | null
  ) => void;
  handleFileInput: (
    event: ChangeEvent<HTMLInputElement>,
    type:
      | "frontFile"
      | "backFile"
      | "referenceFile"
  ) => void;
  handleDrop: (
    event: DragEvent<HTMLDivElement>,
    type:
      | "frontFile"
      | "backFile"
      | "referenceFile"
  ) => void;
  onBack: () => void;
  onStart: () => void;
  error: string;
}) {
  const previewUrl = form.frontFile
    ? URL.createObjectURL(
        form.frontFile
      )
    : "";

  const referenceUrl =
    form.referenceFile
      ? URL.createObjectURL(
          form.referenceFile
        )
      : "";

  return (
    <div>
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">
            DOCUMENT PREVIEW
          </div>

          <h1>
            Review before screening
          </h1>

          <p>
            Confirm that the uploaded
            document is clear and suitable
            for analysis.
          </p>
        </div>
      </div>

      <div className="preview-layout">
        <div className="preview-main">
          <div className="image-preview-card">
            {previewUrl &&
            form.frontFile?.type.startsWith(
              "image/"
            ) ? (
              <img
                src={previewUrl}
                alt="Document preview"
              />
            ) : (
              <div className="preview-placeholder">
                <Icon
                  name="file"
                  size={45}
                />
                <strong>
                  {form.frontFile?.name}
                </strong>
              </div>
            )}
          </div>

          {form.backFile && (
            <div className="preview-secondary">
              <strong>
                Back side uploaded
              </strong>

              <span>
                {form.backFile.name}
              </span>
            </div>
          )}
        </div>

        <div className="content-card preview-details">
          <div className="card-header">
            <h2>
              Document details
            </h2>
          </div>

          <DetailRow
            label="Document type"
            value={form.documentType}
          />

          <DetailRow
            label="Document file"
            value={
              form.frontFile?.name ||
              "Not uploaded"
            }
          />

          <DetailRow
            label="Reference image"
            value={
              form.referenceFile
                ?.name ||
              "Not provided"
            }
          />

          {referenceUrl && (
            <div className="reference-thumbnail">
              <img
                src={referenceUrl}
                alt="Reference"
              />
              <span>
                Reference image
              </span>
            </div>
          )}

          <div className="before-screening">
            <strong>
              Before continuing
            </strong>

            <p>
              Make sure the document is
              fully visible, not heavily
              blurred, and contains enough
              detail for OCR and forensic
              analysis.
            </p>
          </div>

          {error && (
            <div className="error-box">
              <Icon
                name="warning"
                size={17}
              />
              {error}
            </div>
          )}

          <div className="preview-actions">
            <button
              className="secondary-button"
              onClick={onBack}
            >
              <Icon
                name="back"
                size={17}
              />
              Back
            </button>

            <button
              className="primary-button"
              onClick={onStart}
            >
              Start AI Screening
              <Icon
                name="arrow"
                size={17}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* =========================================================
   SCREENING
========================================================= */

function ScreeningPage({
  progress,
  documentType,
}: {
  progress: number;
  documentType: string;
}) {
  const stages = [
    "Preparing document",
    "Running OCR",
    "Validating extracted data",
    "Analyzing document integrity",
    "Performing identity verification",
    "Generating final result",
  ];

  const stageIndex = Math.min(
    stages.length - 1,
    Math.floor(
      (progress / 100) *
        stages.length
    )
  );

  return (
    <div className="screening-page">
      <div className="screening-card">
        <div className="screening-spinner">
          <div />
        </div>

        <div className="eyebrow">
          AI DOCUMENT SCREENING
        </div>

        <h1>
          Analyzing {documentType}
        </h1>

        <p>
          Please wait while the screening
          pipeline processes your document.
        </p>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <div className="progress-percent">
          {progress}%
        </div>

        <div className="screening-stages">
          {stages.map(
            (stage, index) => (
              <div
                key={stage}
                className={
                  index < stageIndex
                    ? "screen-stage complete"
                    : index === stageIndex
                    ? "screen-stage current"
                    : "screen-stage"
                }
              >
                <div className="stage-dot">
                  {index <
                  stageIndex ? (
                    <Icon
                      name="check"
                      size={13}
                    />
                  ) : (
                    index + 1
                  )}
                </div>

                <span>
                  {stage}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   RESULTS
========================================================= */

function ResultsPage({
  result,
  caseRecord,
  navigate,
}: {
  result: ScreeningResult | null;
  caseRecord: CaseRecord | null;
  navigate: (page: Page) => void;
}) {
  if (!result) {
    return (
      <EmptyResult navigate={navigate} />
    );
  }

  const ocr = result.ocr || {};
  const validation = result.validation || {};
  const tampering = result.tampering || {};
  const face = result.face || {};

  const ocrScore = Number.isFinite(ocr?.riskScore) ? Number(ocr.riskScore) : 0;
  const validationScore = Number.isFinite(validation?.riskScore) ? Number(validation.riskScore) : 0;
  const tamperingScore = Number.isFinite(tampering?.score) ? Number(tampering.score) : 0;
  const faceScore = Number.isFinite(face?.matchScore) ? Number(face.matchScore) : 0;

  const getTone = (value: number): "green" | "amber" | "red" => {
    if (value < 40) return "green";
    if (value <= 75) return "amber";
    return "red";
  };

  const ocrTone = getTone(ocrScore);
  const validationTone = getTone(validationScore);
  const tamperingTone = getTone(tamperingScore);
  const faceTone = faceScore >= 75 ? "green" : faceScore >= 40 ? "amber" : "red";

  const extractedFields = Object.entries(ocr).filter(([key, value]) => {
    if ([
      "rawText",
      "lines",
      "components",
      "riskScore",
      "score",
      "confidence",
      "matchScore",
      "status",
      "source",
      "documentType",
      "fileName",
      "ocr_error",
    ].includes(key)) {
      return false;
    }

    if (value === null || value === undefined || value === "") return false;
    if (typeof value === "object") return false;

    return true;
  });

  const faceLabel =
    faceScore >= 75
      ? "Genuine Face Match"
      : faceScore >= 40
      ? "Suspected Match, Review Required"
      : "Risky Match, Review Required";

  const faceDescription =
    faceScore >= 75
      ? "The presented face is consistent with the document photograph."
      : faceScore >= 40
      ? "The face similarity is borderline and requires manual review."
      : "The face similarity is below the accepted threshold and requires review.";

  return (
    <div>
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">SCREENING COMPLETE</div>
          <h1>Screening Results</h1>
          <p>
            AI-assisted document screening result for {result.documentType || "document"}.
          </p>
        </div>

        <button className="primary-button" onClick={() => navigate("verification")}>
          <Icon name="plus" size={18} />
          New Verification
        </button>
      </div>

      <div className="results-stack">
        <div className="result-panel">
          <div className="result-panel-header">
            <div>
              <span className="result-index">01</span>
              <h3>OCR Extraction</h3>
            </div>
            <span className={`result-badge ${ocrTone === "green" ? "success" : ocrTone === "amber" ? "warning" : "danger"}`}>
              {ocrScore < 40 ? "Good extraction" : ocrScore <= 75 ? "Moderate extraction" : "Poor extraction"}
            </span>
          </div>

          <div className={`module-score-row module-${ocrTone}`}>
            <div className="module-score-value">{ocrScore}<small>/100</small></div>
            <div className="module-score-copy">
              <span>OCR module score</span>
              <strong>{ocrScore < 40 ? "Green — sufficient extracted content" : ocrScore <= 75 ? "Amber — partial extraction needs review" : "Red — weak extraction, requires review"}</strong>
            </div>
          </div>

          {extractedFields.length === 0 ? (
            <div className="data-grid">
              <div>
                <span>Result</span>
                <strong>No OCR fields were extracted for this document.</strong>
              </div>
            </div>
          ) : (
            <div className="data-grid">
              {extractedFields.map(([key, value]) => (
                <div key={key}>
                  <span>{key === "documentNumber" ? "Document Number" : key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="result-panel">
          <div className="result-panel-header">
            <div>
              <span className="result-index">02</span>
              <h3>Validation</h3>
            </div>
            <span className={`result-badge ${validationTone === "green" ? "success" : validationTone === "amber" ? "warning" : "danger"}`}>
              {validationScore < 40 ? "High validation confidence" : validationScore <= 75 ? "Moderate validation review" : "Validation failed"}
            </span>
          </div>

          <div className={`module-score-row module-${validationTone}`}>
            <div className="module-score-value">{validationScore}<small>/100</small></div>
            <div className="module-score-copy">
              <span>Validation module score</span>
              <strong>{validationScore < 40 ? "Green — format, checksum, and required fields are valid" : validationScore <= 75 ? "Amber — some checks are weak or incomplete" : "Red — validation issues detected"}</strong>
            </div>
          </div>

          <div className="validation-list">
            <div>
              <span>Document format</span>
              <span className={`check-status ${validation.documentFormat === false ? "fail" : "pass"}`}>
                {validation.documentFormat === false ? "FLAG" : "PASS"}
              </span>
            </div>
            <div>
              <span>Checksum / document number</span>
              <span className={`check-status ${validation.checksum === false ? "fail" : "pass"}`}>
                {validation.checksum === false ? "FLAG" : "PASS"}
              </span>
            </div>
            <div>
              <span>Expiry validity</span>
              <span className={`check-status ${validation.expiry === false ? "fail" : "pass"}`}>
                {validation.expiry === false ? "FLAG" : "PASS"}
              </span>
            </div>
            <div>
              <span>Field consistency</span>
              <span className={`check-status ${validation.fieldConsistency === false ? "fail" : "pass"}`}>
                {validation.fieldConsistency === false ? "FLAG" : "PASS"}
              </span>
            </div>
          </div>
        </div>

        <div className="result-panel">
          <div className="result-panel-header">
            <div>
              <span className="result-index">03</span>
              <h3>Tampering</h3>
            </div>
            <span className={`result-badge ${tamperingTone === "green" ? "success" : tamperingTone === "amber" ? "warning" : "danger"}`}>
              {tamperingScore < 40 ? "No tampering" : tamperingScore <= 75 ? "Slight tampering" : "High tampering"}
            </span>
          </div>

          <div className={`module-score-row module-${tamperingTone}`}>
            <div className="module-score-value">{tamperingScore}<small>/100</small></div>
            <div className="module-score-copy">
              <span>Tampering module score</span>
              <strong>{tamperingScore < 40 ? "Green — no suspicious manipulations detected" : tamperingScore <= 75 ? "Amber — moderate anomaly, manual review" : "Red — high-risk tampering indicators"}</strong>
            </div>
          </div>

          <div className="findings">
            {(tampering.findings || ["No strong forensic anomaly detected by the baseline checks."]).map((finding: string, index: number) => (
              <div key={index} className="finding">
                <span>•</span>
                {finding}
              </div>
            ))}
          </div>
        </div>

        <div className="result-panel">
          <div className="result-panel-header">
            <div>
              <span className="result-index">04</span>
              <h3>Face Liveness</h3>
            </div>
            <span className={`result-badge ${faceTone === "green" ? "success" : faceTone === "amber" ? "warning" : "danger"}`}>
              {face.status || faceLabel}
            </span>
          </div>

          <div className={`face-match-panel face-${faceTone}`}>
            <div className="face-score">
              <strong>{faceScore}</strong>
              <span>/100</span>
            </div>
            <div>
              <span className="face-match-label">{faceLabel}</span>
              <p>{faceDescription}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultMetric({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="result-metric">
      <span>{title}</span>

      <strong>{value}</strong>

      <small>
        {description}
      </small>
    </div>
  );
}

function EmptyResult({
  navigate,
}: {
  navigate: (page: Page) => void;
}) {
  return (
    <EmptyState
      title="No screening result"
      subtitle="Start a new document verification."
      onStart={() =>
        navigate("verification")
      }
    />
  );
}

/* =========================================================
   CASES
========================================================= */

function CasesPage({
  cases,
  search,
  selectCase,
  navigate,
}: {
  cases: CaseRecord[];
  search: string;
  selectCase: (
    item: CaseRecord
  ) => void;
  navigate: (page: Page) => void;
}) {
  return (
    <div>
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">
            CASE MANAGEMENT
          </div>

          <h1>
            Verification Cases
          </h1>

          <p>
            Cases created during this
            browser session.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() =>
            navigate("verification")
          }
        >
          <Icon
            name="plus"
            size={18}
          />
          New Verification
        </button>
      </div>

      <div className="content-card">
        <div className="card-header">
          <div>
            <h2>
              Cases
            </h2>

            <p>
              {cases.length} case
              {cases.length === 1
                ? ""
                : "s"}{" "}
              found
              {search
                ? ` for "${search}"`
                : ""}
              .
            </p>
          </div>
        </div>

        {cases.length === 0 ? (
          <EmptyState
            onStart={() =>
              navigate("verification")
            }
          />
        ) : (
          <CaseTable
            cases={cases}
            selectCase={selectCase}
          />
        )}
      </div>
    </div>
  );
}

function CaseTable({
  cases,
  selectCase,
}: {
  cases: CaseRecord[];
  selectCase: (
    item: CaseRecord
  ) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Applicant</th>
            <th>Document</th>
            <th>Risk</th>
            <th>Outcome</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {cases.map((item) => (
            <tr
              key={item.id}
              onClick={() =>
                selectCase(item)
              }
              className="clickable-row"
            >
              <td>
                <strong>
                  {item.id}
                </strong>
              </td>

              <td>
                {item.applicantName}
              </td>

              <td>
                <span className="doc-chip">
                  {item.documentType}
                </span>
              </td>

              <td>
                <RiskBadge
                  level={
                    item.riskLevel
                  }
                  score={
                    item.riskScore
                  }
                />
              </td>

              <td>
                {item.outcome}
              </td>

              <td>
                {formatDate(
                  item.createdAt
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskBadge({
  level,
  score,
}: {
  level: string;
  score: number;
}) {
  const lower =
    level.toLowerCase();

  let cls = "risk-low";

  if (lower.includes("high")) {
    cls = "risk-high";
  } else if (
    lower.includes("medium")
  ) {
    cls = "risk-medium";
  }

  return (
    <span
      className={`risk-badge ${cls}`}
    >
      {score} · {level}
    </span>
  );
}

/* =========================================================
   HISTORY
========================================================= */

function HistoryPage({
  cases,
  selectCase,
}: {
  cases: CaseRecord[];
  selectCase: (
    item: CaseRecord
  ) => void;
}) {
  return (
    <div>
      <PageTitle
        eyebrow="AUDIT TRAIL"
        title="Verification History"
        subtitle="Review all document screenings from the current session."
      />

      <div className="content-card">
        {cases.length === 0 ? (
          <EmptyMiniState
            text="No verification history available in this session."
          />
        ) : (
          <div className="history-list">
            {cases.map((item) => (
              <button
                key={item.id}
                className="history-item"
                onClick={() =>
                  selectCase(item)
                }
              >
                <div className="history-icon">
                  <Icon
                    name="file"
                    size={20}
                  />
                </div>

                <div className="history-main">
                  <strong>
                    {item.id}
                  </strong>

                  <span>
                    {
                      item.documentType
                    }{" "}
                    ·{" "}
                    {
                      item.applicantName
                    }
                  </span>
                </div>

                <div>
                  <RiskBadge
                    level={
                      item.riskLevel
                    }
                    score={
                      item.riskScore
                    }
                  />

                  <small>
                    {formatDate(
                      item.createdAt
                    )}
                  </small>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SECONDARY REVIEW
========================================================= */

function ReviewPage({
  cases,
  selectCase,
}: {
  cases: CaseRecord[];
  selectCase: (
    item: CaseRecord
  ) => void;
}) {
  const reviewCases =
    cases.filter(
      (item) =>
        item.riskLevel
          .toLowerCase()
          .includes("high") ||
        item.outcome
          .toLowerCase()
          .includes("review") ||
        item.outcome
          .toLowerCase()
          .includes("pending")
    );

  return (
    <div>
      <PageTitle
        eyebrow="MANUAL REVIEW"
        title="Secondary Review"
        subtitle="Documents requiring additional officer attention."
      />

      <div className="content-card">
        {reviewCases.length ===
        0 ? (
          <EmptyMiniState text="No cases currently require secondary review." />
        ) : (
          <CaseTable
            cases={reviewCases}
            selectCase={selectCase}
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================
   REPORTS
========================================================= */

function ReportsPage({
  cases,
  statistics,
}: {
  cases: CaseRecord[];
  statistics: {
    total: number;
    verified: number;
    pending: number;
    highRisk: number;
  };
}) {
  const averageRisk =
    cases.length === 0
      ? 0
      : Math.round(
          cases.reduce(
            (sum, item) =>
              sum + item.riskScore,
            0
          ) / cases.length
        );

  return (
    <div>
      <PageTitle
        eyebrow="ANALYTICS"
        title="Reports"
        subtitle="Session-level screening statistics and risk summary."
      />

      <div className="stats-grid">
        <StatCard
          title="Total Screened"
          value={statistics.total}
          tone="blue"
        />

        <StatCard
          title="Verified"
          value={statistics.verified}
          tone="green"
        />

        <StatCard
          title="Pending Review"
          value={statistics.pending}
          tone="amber"
        />

        <StatCard
          title="High Risk"
          value={statistics.highRisk}
          tone="red"
        />
      </div>

      <div className="content-card">
        <div className="card-header">
          <div>
            <h2>
              Risk Summary
            </h2>

            <p>
              Average document risk score
              for this session.
            </p>
          </div>
        </div>

        <div className="report-number">
          {averageRisk}
          <span>/ 100</span>
        </div>

        <div className="progress-track large">
          <div
            className="progress-fill"
            style={{
              width: `${averageRisk}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage() {
  return (
    <div>
      <PageTitle
        eyebrow="SYSTEM CONFIGURATION"
        title="Settings"
        subtitle="Prototype configuration and system information."
      />

      <div className="settings-grid">
        <div className="content-card">
          <h2>
            Screening Pipeline
          </h2>

          <SettingRow
            label="OCR Engine"
            value="Enabled"
          />

          <SettingRow
            label="Document Validation"
            value="Enabled"
          />

          <SettingRow
            label="Tampering Detection"
            value="Enabled"
          />

          <SettingRow
            label="Face Verification"
            value="Enabled"
          />
        </div>

        <div className="content-card">
          <h2>
            Prototype Session
          </h2>

          <SettingRow
            label="Storage"
            value="In-memory only"
          />

          <SettingRow
            label="Persistence"
            value="Disabled"
          />

          <SettingRow
            label="Hard Refresh"
            value="Clears cases"
          />

          <SettingRow
            label="Logout"
            value="Clears cases"
          />
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* =========================================================
   COMMON COMPONENTS
========================================================= */

function PageTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-heading">
      <div className="eyebrow">
        {eyebrow}
      </div>

      <h1>{title}</h1>

      <p>{subtitle}</p>
    </div>
  );
}

function EmptyState({
  title = "No cases yet",
  subtitle = "Start a new document verification to see it appear here.",
  onStart,
}: {
  title?: string;
  subtitle?: string;
  onStart: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon
          name="cases"
          size={32}
        />
      </div>

      <h3>{title}</h3>

      <p>{subtitle}</p>

      <button
        className="secondary-button"
        onClick={onStart}
      >
        Start New Verification
      </button>
    </div>
  );
}

function EmptyMiniState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="empty-mini">
      <Icon
        name="file"
        size={24}
      />
      <span>{text}</span>
    </div>
  );
}

/* =========================================================
   CSS
========================================================= */

const APP_CSS = `
* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  color: #172b4d;
  background: #f6f8fb;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  display: flex;
  min-height: 100vh;
  background: #f6f8fb;
}

.sidebar {
  width: 230px;
  min-width: 230px;
  background: #1e3a5f;
  color: white;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.brand {
  height: 88px;
  padding: 22px 20px;
  display: flex;
  gap: 11px;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 9px;
  background: #2879c9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-weight: 750;
  font-size: 16px;
}

.brand-version {
  color: #a9c3df;
  font-size: 11px;
  margin-top: 3px;
}

.sidebar-nav {
  padding: 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-item {
  border: 0;
  background: transparent;
  color: #c7d7e9;
  min-height: 44px;
  border-radius: 9px;
  padding: 0 13px;
  display: flex;
  gap: 13px;
  align-items: center;
  text-align: left;
  transition: .15s ease;
}

.nav-item:hover {
  background: rgba(255,255,255,.08);
  color: white;
}

.nav-item.active {
  background: #2e7dcc;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,.12);
}

.sidebar-bottom {
  margin-top: auto;
  padding: 15px 12px 18px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 5px 13px;
}

.avatar {
  width: 39px;
  height: 39px;
  border-radius: 50%;
  background: #3287d3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
}

.profile-info {
  min-width: 0;
}

.profile-info strong,
.profile-info span {
  display: block;
}

.profile-info strong {
  font-size: 13px;
}

.profile-info span {
  margin-top: 3px;
  color: #a9c3df;
  font-size: 10px;
}

.sidebar-logout {
  width: 100%;
  border: 1px solid rgba(255,255,255,.15);
  background: transparent;
  color: #d7e4f1;
  border-radius: 8px;
  height: 37px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.sidebar-logout:hover {
  background: rgba(255,255,255,.07);
}

.main-shell {
  flex: 1;
  min-width: 0;
}

.top-header {
  height: 68px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 27px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 15px;
}

.online-badge {
  border: 1px solid #cdebd8;
  background: #f1fbf5;
  color: #20814a;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  display: flex;
  gap: 5px;
  align-items: center;
}

.online-badge span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #20a05a;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.search-box {
  width: 235px;
  height: 38px;
  border: 1px solid #dbe3ec;
  border-radius: 999px;
  display: flex;
  align-items: center;
  padding: 0 13px;
  color: #8b9bb0;
  background: #fafcfe;
}

.search-box input {
  border: 0;
  outline: 0;
  background: transparent;
  width: 100%;
  padding-left: 8px;
  font-size: 12px;
}

.icon-button {
  width: 38px;
  height: 38px;
  border: 1px solid #dbe3ec;
  border-radius: 50%;
  background: white;
  color: #53677f;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-button {
  height: 38px;
  padding: 0 13px;
  border: 1px solid #dbe3ec;
  background: white;
  border-radius: 8px;
  color: #38516e;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}

.main-content {
  padding: 30px;
  max-width: 1500px;
  margin: auto;
}

.page-heading {
  margin-bottom: 25px;
}

.page-heading-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 26px;
}

.eyebrow {
  color: #64809d;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .13em;
  margin-bottom: 7px;
}

.page-heading h1,
.page-heading-row h1 {
  margin: 0;
  color: #122a48;
  font-size: 26px;
  letter-spacing: -.02em;
}

.page-heading p,
.page-heading-row p {
  margin: 7px 0 0;
  color: #70839a;
  font-size: 13px;
}

.primary-button,
.secondary-button {
  min-height: 40px;
  border-radius: 8px;
  padding: 0 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  font-size: 12px;
}

.primary-button {
  border: 1px solid #1e426b;
  background: #1e426b;
  color: white;
  box-shadow: 0 3px 8px rgba(30,66,107,.15);
}

.primary-button:hover {
  background: #173654;
}

.secondary-button {
  border: 1px solid #d3dde8;
  background: white;
  color: #34506d;
}

.secondary-button:hover {
  background: #f5f8fb;
}

.full {
  width: 100%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 22px;
}

.stat-card {
  border-radius: 11px;
  padding: 19px 20px;
  min-height: 125px;
  border: 1px solid transparent;
}

.stat-card.blue {
  background: #eff6ff;
  border-color: #dbeafe;
}

.stat-card.green {
  background: #f0fdf4;
  border-color: #dcfce7;
}

.stat-card.amber {
  background: #fffbeb;
  border-color: #fef3c7;
}

.stat-card.red {
  background: #fef2f2;
  border-color: #fee2e2;
}

.stat-label {
  color: #60758e;
  font-size: 12px;
  font-weight: 650;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  margin-top: 9px;
  color: #173654;
}

.stat-small {
  margin-top: 3px;
  font-size: 10px;
  color: #8393a6;
}

.content-card {
  background: white;
  border: 1px solid #e1e8ef;
  border-radius: 11px;
  margin-bottom: 20px;
  overflow: hidden;
}

.card-header {
  min-height: 70px;
  border-bottom: 1px solid #e8edf3;
  padding: 17px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.card-header h2,
.section-title h2 {
  margin: 0;
  font-size: 15px;
  color: #1a3451;
}

.card-header p,
.section-title p {
  margin: 5px 0 0;
  font-size: 11px;
  color: #7b8da2;
}

.empty-state {
  min-height: 285px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px;
}

.empty-icon {
  width: 67px;
  height: 67px;
  border-radius: 15px;
  background: #f1f5f9;
  color: #8fa0b2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.empty-state h3 {
  margin: 0;
  font-size: 16px;
}

.empty-state p {
  margin: 7px 0 17px;
  max-width: 370px;
  color: #8391a2;
  font-size: 12px;
}

.empty-mini {
  min-height: 160px;
  color: #8b9bad;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 12px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

th {
  text-align: left;
  background: #f8fafc;
  color: #71849a;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: 12px 17px;
  border-bottom: 1px solid #e6ebf1;
}

td {
  padding: 15px 17px;
  border-bottom: 1px solid #edf1f5;
  color: #53677f;
}

tr:last-child td {
  border-bottom: 0;
}

.clickable-row:hover {
  background: #f8fbff;
}

.doc-chip {
  background: #eef4fa;
  color: #42617e;
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 10px;
}

.risk-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 700;
}

.risk-low {
  color: #167344;
  background: #eaf8ef;
}

.risk-medium {
  color: #9a6800;
  background: #fff5d9;
}

.risk-high {
  color: #b32b2b;
  background: #ffebeb;
}

/* Verification */

.workflow-card {
  background: white;
  border: 1px solid #e1e8ef;
  border-radius: 11px;
  min-height: 70px;
  display: flex;
  align-items: center;
  padding: 0 25px;
  margin-bottom: 20px;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #91a0b0;
  font-size: 11px;
  white-space: nowrap;
}

.workflow-step span {
  width: 27px;
  height: 27px;
  border-radius: 50%;
  border: 1px solid #dce4ec;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 750;
}

.workflow-step.active {
  color: #234d78;
  font-weight: 700;
}

.workflow-step.active span {
  background: #245b8f;
  color: white;
  border-color: #245b8f;
}

.workflow-line {
  flex: 1;
  height: 1px;
  background: #e2e8ef;
  margin: 0 15px;
}

.section-title {
  padding: 19px 20px 12px;
}

.document-type-grid {
  padding: 5px 20px 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.document-type {
  border: 1px solid #dfe7ef;
  background: white;
  border-radius: 9px;
  min-height: 100px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  color: #577089;
  text-align: left;
}

.document-type:hover {
  border-color: #98b6d3;
}

.document-type.selected {
  border: 2px solid #2d6ea8;
  background: #f5f9fd;
  color: #1e4f7d;
}

.document-type strong {
  font-size: 13px;
}

.document-type span {
  color: #8392a2;
  font-size: 10px;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 18px;
}

.upload-box {
  background: white;
  border: 1px solid #e1e8ef;
  border-radius: 11px;
  padding: 16px;
}

.upload-box-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 11px;
  color: #28435e;
  font-size: 12px;
}

.required {
  color: #b57500;
  background: #fff5d9;
  padding: 3px 6px;
  border-radius: 5px;
  font-size: 9px;
}

.drop-zone {
  min-height: 190px;
  border: 1.5px dashed #cbd7e3;
  background: #fafcfe;
  border-radius: 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 18px;
  text-align: center;
}

.drop-zone.has-file {
  border-style: solid;
  background: #f7fbff;
}

.upload-icon,
.uploaded-file-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #edf4fa;
  color: #46749e;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 9px;
}

.drop-zone strong {
  font-size: 12px;
  color: #3e5870;
}

.drop-zone span {
  font-size: 10px;
  color: #8796a6;
  margin-top: 4px;
}

.browse-button {
  margin-top: 13px;
  padding: 8px 12px;
  border-radius: 7px;
  border: 1px solid #d3dfe9;
  background: white;
  color: #345875;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.upload-description {
  margin: 8px 1px 0;
  color: #8392a2;
  font-size: 10px;
}

.info-box {
  background: #f1f7fc;
  border: 1px solid #d8e8f5;
  border-radius: 9px;
  padding: 13px 15px;
  display: flex;
  gap: 11px;
  color: #356486;
  margin-bottom: 18px;
}

.info-box p {
  margin: 4px 0 0;
  color: #678096;
  font-size: 11px;
  line-height: 1.5;
}

.info-box code {
  background: #e4eef7;
  padding: 2px 4px;
  border-radius: 3px;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
}

/* Preview */

.preview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(330px, .8fr);
  gap: 20px;
}

.preview-main {
  min-width: 0;
}

.image-preview-card {
  background: #edf1f5;
  border: 1px solid #dce4eb;
  border-radius: 12px;
  padding: 14px;
  min-height: 450px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-card img {
  display: block;
  max-width: 100%;
  max-height: 650px;
  object-fit: contain;
  border-radius: 5px;
  box-shadow: 0 5px 18px rgba(30,50,70,.15);
}

.preview-placeholder {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8192a3;
  gap: 10px;
}

.preview-secondary {
  margin-top: 10px;
  background: white;
  border: 1px solid #e1e8ef;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.preview-secondary span {
  color: #778a9e;
}

.preview-details {
  height: fit-content;
}

.detail-row {
  min-height: 51px;
  border-bottom: 1px solid #edf1f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 0 18px;
}

.detail-row span {
  color: #70849a;
  font-size: 11px;
}

.detail-row strong {
  color: #1f3d5a;
  font-size: 11px;
  text-align: right;
  max-width: 210px;
  word-break: break-word;
}

.before-screening {
  margin: 15px;
  background: #f4f8ff;
  border: 1px solid #d9e7fb;
  border-radius: 9px;
  padding: 13px;
}

.before-screening strong {
  font-size: 11px;
}

.before-screening p {
  margin: 5px 0 0;
  color: #637a92;
  font-size: 10px;
  line-height: 1.5;
}

.preview-actions {
  padding: 0 15px 15px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.reference-thumbnail {
  margin: 15px;
  border: 1px solid #e0e7ee;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
}

.reference-thumbnail img {
  width: 52px;
  height: 52px;
  border-radius: 5px;
  object-fit: cover;
}

.reference-thumbnail span {
  font-size: 10px;
  color: #6c7f94;
}

/* Screening */

.screening-page {
  min-height: calc(100vh - 128px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.screening-card {
  background: white;
  border: 1px solid #e1e8ef;
  border-radius: 13px;
  padding: 42px;
  width: min(650px, 100%);
  text-align: center;
  box-shadow: 0 12px 35px rgba(27,50,75,.06);
}

.screening-spinner {
  width: 70px;
  height: 70px;
  margin: 0 auto 25px;
  border: 4px solid #e4edf5;
  border-top-color: #28699c;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.screening-spinner div {
  display: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.screening-card h1 {
  margin: 0;
  font-size: 23px;
}

.screening-card p {
  color: #788ba0;
  font-size: 12px;
  margin: 7px 0 25px;
}

.progress-track {
  height: 8px;
  background: #eaf0f5;
  border-radius: 999px;
  overflow: hidden;
}

.progress-track.large {
  height: 12px;
}

.progress-fill {
  height: 100%;
  background: #2b70a8;
  border-radius: inherit;
  transition: width .4s ease;
}

.progress-percent {
  margin: 9px 0 25px;
  color: #365d7f;
  font-size: 11px;
  font-weight: 750;
}

.screening-stages {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.screen-stage {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #99a7b5;
  font-size: 11px;
}

.stage-dot {
  width: 25px;
  height: 25px;
  border: 1px solid #d8e1e9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
}

.screen-stage.current {
  color: #285d88;
  font-weight: 700;
}

.screen-stage.current .stage-dot {
  border-color: #3974a5;
}

.screen-stage.complete {
  color: #278052;
}

.screen-stage.complete .stage-dot {
  background: #278052;
  border-color: #278052;
  color: white;
}

/* Results */

.result-hero {
  background: white;
  border: 1px solid #e1e8ef;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.result-hero h2 {
  margin: 0;
  font-size: 24px;
}

.result-hero p {
  margin: 7px 0 0;
  color: #8292a3;
  font-size: 11px;
}

.risk-score {
  min-width: 145px;
  text-align: center;
  border-radius: 11px;
  padding: 15px;
}

.risk-score span {
  display: block;
  font-size: 10px;
  color: #70849a;
}

.risk-score strong {
  font-size: 35px;
  display: inline-block;
  margin-top: 2px;
}

.risk-score small {
  color: #8b9aaa;
}

.risk-score label {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  font-weight: 800;
}

.risk-score.low-risk {
  background: #eefaf2;
  color: #27784c;
}

.risk-score.medium-risk {
  background: #fff8e5;
  color: #986c09;
}

.risk-score.high-risk {
  background: #fff0f0;
  color: #ad3838;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 13px;
  margin-bottom: 18px;
}

.result-metric {
  background: white;
  border: 1px solid #e1e8ef;
  border-radius: 10px;
  padding: 16px;
}

.result-metric span,
.result-metric small {
  display: block;
  color: #7c8ea1;
}

.result-metric span {
  font-size: 10px;
  font-weight: 750;
  text-transform: uppercase;
}

.result-metric strong {
  display: block;
  margin: 10px 0 5px;
  font-size: 18px;
  color: #23425f;
}

.result-metric small {
  font-size: 9px;
}

.fields-grid {
  padding: 18px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.field-card {
  border: 1px solid #e3e9ef;
  border-radius: 8px;
  padding: 12px;
}

.field-card span {
  display: block;
  color: #8292a2;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 5px;
}

.field-card strong {
  display: block;
  color: #294761;
  font-size: 11px;
  word-break: break-word;
}

.formula-box {
  margin: 18px;
  padding: 16px;
  background: #f4f8fc;
  border: 1px solid #dce7f0;
  border-radius: 8px;
}

.formula-box strong {
  display: block;
  font-size: 15px;
  color: #254e72;
}

.formula-box span {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: #71859a;
}

/* History */

.history-list {
  display: flex;
  flex-direction: column;
}

.history-item {
  border: 0;
  border-bottom: 1px solid #edf1f5;
  background: white;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.history-item:last-child {
  border-bottom: 0;
}

.history-item:hover {
  background: #f8fbfe;
}

.history-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #eff5fa;
  color: #4b7699;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-main {
  flex: 1;
}

.history-main strong,
.history-main span {
  display: block;
}

.history-main strong {
  font-size: 12px;
}

.history-main span {
  color: #7c8da0;
  font-size: 10px;
  margin-top: 4px;
}

.history-item > div:last-child {
  text-align: right;
}

.history-item small {
  display: block;
  color: #96a2ae;
  font-size: 9px;
  margin-top: 5px;
}

/* Reports */

.report-number {
  padding: 25px 20px 10px;
  font-size: 42px;
  font-weight: 800;
  color: #204c73;
}

.report-number span {
  font-size: 14px;
  color: #8a99a9;
}

.progress-track.large {
  margin: 0 20px 25px;
}

/* Settings */

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}

.settings-grid .content-card {
  padding: 20px;
}

.settings-grid h2 {
  margin: 0 0 15px;
  font-size: 15px;
}

.setting-row {
  min-height: 45px;
  border-top: 1px solid #edf1f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.setting-row span {
  color: #77899c;
}

.setting-row strong {
  color: #365875;
}

/* Errors */

.error-box {
  margin: 15px;
  border: 1px solid #ffcaca;
  background: #fff5f5;
  color: #b23838;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.error-box.large {
  margin: 0 0 15px;
}

/* Login */

.login-page {
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    #f5f7fa 0%,
    #dce5ef 100%
  );
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.login-card {
  width: min(440px, 100%);
  background: white;
  border-radius: 11px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(20,45,70,.16);
}

.login-header {
  background: #1c3149;
  color: white;
  padding: 29px;
  text-align: center;
}

.login-shield {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #2e6ea8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 13px;
}

.login-header h1 {
  font-size: 21px;
  margin: 0;
  line-height: 1.25;
}

.login-header p {
  color: #a9bed2;
  font-size: 11px;
  margin: 8px 0 0;
}

.login-body {
  padding: 25px;
}

.login-body h2 {
  margin: 0 0 19px;
  font-size: 17px;
}

.login-body > label {
  display: block;
  color: #4b6177;
  font-size: 11px;
  font-weight: 650;
  margin: 13px 0 6px;
}

.login-body input {
  width: 100%;
  height: 40px;
  border: 1px solid #d5dfe8;
  border-radius: 7px;
  padding: 0 11px;
  outline: none;
  font-size: 12px;
}

.login-body input:focus {
  border-color: #5c8bb1;
  box-shadow: 0 0 0 3px rgba(92,139,177,.1);
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  padding-right: 65px;
}

.password-toggle {
  position: absolute;
  right: 7px;
  top: 6px;
  height: 28px;
  border: 0;
  background: transparent;
  color: #477298;
  font-size: 10px;
  font-weight: 700;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 13px 0 17px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #687b8e;
  font-size: 10px;
}

.checkbox-label input {
  width: 14px;
  height: 14px;
}

.link-button {
  border: 0;
  background: transparent;
  color: #2872ad;
  font-size: 10px;
}

.security-notice {
  margin-top: 17px;
  border: 1px solid #f2dfb0;
  background: #fff9e9;
  color: #876b22;
  border-radius: 8px;
  padding: 11px;
  display: flex;
  gap: 8px;
  font-size: 9px;
  line-height: 1.5;
}

/* Responsive */

@media (max-width: 1050px) {
  .sidebar {
    width: 200px;
    min-width: 200px;
  }

  .stats-grid,
  .result-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .preview-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .sidebar {
    width: 65px;
    min-width: 65px;
  }

  .brand {
    justify-content: center;
    padding: 12px;
  }

  .brand > div:last-child,
  .nav-item span,
  .profile-info,
  .sidebar-logout {
    display: none;
  }

  .nav-item {
    justify-content: center;
    padding: 0;
  }

  .profile {
    justify-content: center;
  }

  .top-header {
    padding: 0 15px;
  }

  .header-title > strong {
    display: none;
  }

  .search-box {
    width: 170px;
  }

  .main-content {
    padding: 18px;
  }

  .page-heading-row {
    flex-direction: column;
  }

  .stats-grid,
  .document-type-grid,
  .upload-grid,
  .result-grid,
  .fields-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .workflow-card {
    overflow-x: auto;
  }

  .workflow-line {
    min-width: 20px;
  }

  .result-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .risk-score {
    width: 100%;
  }
}
`;