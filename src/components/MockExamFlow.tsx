import React, { useState, useEffect, useRef } from "react";
import { Question, ExamBodyType, SubjectType } from "../types";
import { 
  ArrowLeft, Compass, Play, Clock, Sparkles, AlertCircle, 
  ChevronLeft, ChevronRight, CheckCircle, RefreshCw, Upload, 
  Copy, Download, FileText, Award, Layers, Check, X, HelpCircle, BookOpen, Timer 
} from "lucide-react";

interface MockExamFlowProps {
  questions: Question[];
  defaultSubject?: string;
  defaultInstitute?: ExamBodyType;
  chaptersMap?: Record<string, string[]>;
  onBack: () => void;
}

interface ExamConfig {
  subject: string;
  institute: ExamBodyType;
  type: "full" | "chapters";
  selectedChapters: string[];
  maxMarks: number;
  durationMode: "timed" | "untimed";
  durationMinutes: number;
}

interface StudentAnswer {
  questionId: string;
  selectedMcqOption: 'A' | 'B' | 'C' | 'D' | null;
  writtenAnswer: string;
  flagged: boolean;
}

interface MCQOption {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  explanation: string;
}

interface AIEvaluationResult {
  overallScore: number;
  maxMarks: number;
  feedback: {
    questionId: string;
    marksAwarded: number;
    maxMarks: number;
    comments: string;
    keyMissedConcepts: string;
    remedialAdvice: string;
  }[];
  generalComments: string;
}

// Chapter list matching seed data subjects
const chaptersMap: Record<string, string[]> = {
  "CM1": ["Interest Theory", "Life Tables & Annuities", "Loan Mortgages", "Reserving Methods", "Mortality Models"],
  "CM2": ["Capital Structure", "Mean-Variance Portfolio Theory", "Black-Scholes Formula", "Stochastic Interest Rates", "ALM"],
  "CS1": ["Probability Distributions", "Bayesian Credibility", "Linear Regression", "Hypothesis Testing", "Monte Carlo Methods"],
  "CS2": ["Stochastic Processes", "Markov Chains", "Survival Models", "Extreme Value Theory", "Time Series Models"],
  "CB1": ["Corporate Governance", "Balance Sheet Analysis", "Accounting Principles", "Corporate Financing", "Capital Allocation"],
  "CB2": ["Microeconomics Analysis", "Macroeconomics Policies", "Fiscal Budgets", "Monetary Policy", "Inflation & Trading Bonds"],
  "CP1": ["Risk Management Framework", "Solvency Systems", "Syllabus Governance", "Capital Management", "Investment Strategies"],
  "CP2": ["Actuarial Modelling Procedures", "Documentation Specifications", "Excel Audit Framework", "Sensitivity Analyses"],
  "CP3": ["Professional Communication", "Explanation of Mathematical Concepts", "Jargon Elimination"],
  "SP": ["Asset Liability Matching", "Stochastic Modelling", "Investments & Derivatives", "State Superannuation", "Pension Scheme Management", "Solvency Capital Requirement"],
  "SA": ["Strategic Corporate Capitalization", "Enterprise Risk Management", "Longevity Risk Hedging", "Group Reinsurance Strategy"]
};

// MCQ Options Generator
const getMcqOptionsForQuestion = (q: Question): MCQOption[] => {
  const id = q.questionId;
  
  if (id.includes("sp5") || q.topic.toLowerCase().includes("immunisation") || q.chapter.toLowerCase().includes("matching")) {
    return [
      { letter: 'A', text: "PV(A) = PV(L), Dur(A) = Dur(L), and Convexity(A) > Convexity(L)", explanation: "These are Redington's classic three conditions for immunization against small parallel interest rate shifts." },
      { letter: 'B', text: "PV(A) > PV(L), Dur(A) = Dur(L), and Convexity(A) < Convexity(L)", explanation: "Incorrect. Convexity of assets must be strictly greater than liabilities to ensure assets outperform on any rate shift." },
      { letter: 'C', text: "PV(A) = PV(L), Dur(A) > Dur(L), and Convexity(A) > Convexity(L)", explanation: "Incorrect. Durations must be equal, otherwise a direct duration mismatch introduces substantial risk." },
      { letter: 'D', text: "PV(A) = PV(L), Dur(A) = Dur(L), and Convexity(A) = Convexity(L)", explanation: "Incorrect. Convexity of assets must be strictly greater than liabilities, not equal." }
    ];
  }
  
  if (id.includes("cp1") || q.topic.toLowerCase().includes("solvency") || q.chapter.toLowerCase().includes("capital")) {
    return [
      { letter: 'A', text: "Lower Solvency Capital Requirement (SCR) by replacing conservative generic assumptions with firm-specific data, passing the 'Use Test'.", explanation: "Correct. Internal models reflect actual risk profiles more accurately and require supervisory checks like the Use Test." },
      { letter: 'B', text: "Immediate regulatory exemption from capital holding requirements without supervisory audits.", explanation: "Incorrect. Supervisors require strict checks, and there is never an exemption from holding capital." },
      { letter: 'C', text: "Elimination of model risk and zero future costs of calibration.", explanation: "Incorrect. Adopting custom models actually increases model risk and calibration expenses significantly." },
      { letter: 'D', text: "A guaranteed 50% decrease in operational risk capital charges.", explanation: "Incorrect. No automatic or guaranteed reductions exist under Solvency II directives." }
    ];
  }
  
  if (id.includes("cm1") || q.topic.toLowerCase().includes("annuity") || q.chapter.toLowerCase().includes("life tables")) {
    return [
      { letter: 'A', text: "741,050 INR (Calculated in advance using ä_60 = 14.821)", explanation: "Correct. Net single premium for an annuity in advance is Premium = Annual Payment * ä_x." },
      { letter: 'B', text: "691,050 INR (Calculated in arrears using a_60 = 13.821)", explanation: "Incorrect. This represents an annuity paid in arrears (at the end of the year), whereas the question states 'in advance'." },
      { letter: 'C', text: "815,120 INR (Using an incorrect interest rate assumption of 3% per annum)", explanation: "Incorrect. The discount rate is specified as 4% per annum." },
      { letter: 'D', text: "50,000 INR (Only representing a single year of payment without mortality/discounting factors)", explanation: "Incorrect. This is just a single year's payout, neglecting the actuarial lifetime survival probabilities." }
    ];
  }
  
  if (id.includes("cs2") || q.topic.toLowerCase().includes("markov") || q.chapter.toLowerCase().includes("stochastic")) {
    return [
      { letter: 'A', text: "pi_0 = 1 - p, pi_1 = p(1-p), pi_2 = p^2 (where p = e^-lambda)", explanation: "Correct. Setting up pi * P = pi and using p = e^-lambda yields these stationary probabilities." },
      { letter: 'B', text: "pi_0 = p, pi_1 = 1-p, pi_2 = p^2 (where p = e^-lambda)", explanation: "Incorrect. This transition matrix layout does not satisfy the boundary conditions at state 0%." },
      { letter: 'C', text: "pi_0 = 1/3, pi_1 = 1/3, pi_2 = 1/3 (equal distribution assumption)", explanation: "Incorrect. The stationary distribution is highly dependent on the claim intensity parameter lambda." },
      { letter: 'D', text: "pi_0 = 1-p^2, pi_1 = p, pi_2 = p(1-p) (where p = e^-lambda)", explanation: "Incorrect. Does not satisfy the state transition balance equations." }
    ];
  }

  // Fallback conceptual options
  return [
    { letter: 'A', text: `Option A: Actuarial valuation of ${q.topic || 'the asset-liability mismatch'} using standard syllabus specifications.`, explanation: "Correct. This option conforms to standard regulatory guidance." },
    { letter: 'B', text: `Option B: Valued using generic assumptions ignoring ${q.chapter || 'the relevant actuarial guidelines'}.`, explanation: "Incorrect. This violates core actuarial modeling principles." },
    { letter: 'C', text: `Option C: Assuming deterministic values without checking the stochastic properties of ${q.topic || 'the scenario'}.`, explanation: "Incorrect. Actuarial assessments require evaluating stochastic parameters." },
    { letter: 'D', text: `Option D: Disregarding the covariance or correlation between risk categories under high stress.`, explanation: "Incorrect. Assuming zero correlation under stress is a classic modeling mistake." }
  ];
};

export default function MockExamFlow({ 
  questions, 
  defaultSubject, 
  defaultInstitute, 
  chaptersMap: propChaptersMap,
  onBack 
}: MockExamFlowProps) {
  // Use dynamic chaptersMap or fallback to internal static map
  const activeChaptersMap = propChaptersMap || chaptersMap;

  // Step tracker: "config" | "exam" | "results"
  const [step, setStep] = useState<"config" | "exam" | "results">("config");

  // Config parameters
  const [selectedSubject, setSelectedSubject] = useState<string>(defaultSubject || "CM1");
  const [selectedInstitute, setSelectedInstitute] = useState<ExamBodyType>(defaultInstitute || "IFOA");
  const [mockType, setMockType] = useState<"full" | "chapters">("full");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [durationMode, setDurationMode] = useState<"timed" | "untimed">("timed");
  const [customMinutes, setCustomMinutes] = useState<number>(180);

  // New configuration options for custom question counts and adaptive timing
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [timeAdjustmentMode, setTimeAdjustmentMode] = useState<"by-marks" | "by-questions" | "custom">("by-marks");
  const [minsPerMark, setMinsPerMark] = useState<number>(1.8);
  const [minsPerQuestion, setMinsPerQuestion] = useState<number>(15);

  // Back navigation with confirmations
  const handleBack = () => {
    if (step === "exam") {
      if (window.confirm("Are you sure you want to quit the active mock exam? All progress will be lost.")) {
        setStep("config");
      }
    } else if (step === "results") {
      setStep("config");
    } else {
      onBack();
    }
  };

  // Active Exam state
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, StudentAnswer>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [totalExamDuration, setTotalExamDuration] = useState<number>(0); // in seconds

  // AI Evaluation states
  const [evalInputText, setEvalInputText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AIEvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize time remaining when exam starts
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  // Handle chapters mapping
  const currentChapterList = activeChaptersMap[selectedSubject] || activeChaptersMap["CM1"] || [];

  const handleToggleChapter = (chap: string) => {
    if (selectedChapters.includes(chap)) {
      setSelectedChapters(prev => prev.filter(c => c !== chap));
    } else {
      setSelectedChapters(prev => [...prev, chap]);
    }
  };

  // Generate Exam logic
  const handleStartExam = () => {
    // 1. Filter questions by subject & institute
    let pool = questions.filter(
      q => q.status === "approved" &&
      q.examBody === selectedInstitute &&
      (q.subject === selectedSubject || (selectedSubject === "SP" && q.subject.startsWith("SP")) || (selectedSubject === "SA" && q.subject.startsWith("SA")))
    );

    // 2. Filter by chapters if Chapter practice is selected
    if (mockType === "chapters" && selectedChapters.length > 0) {
      pool = pool.filter(q => selectedChapters.includes(q.chapter));
    }

    // 3. Shuffle pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());

    // 4. Assemble questions up to maxMarks and numQuestions
    let selected: Question[] = [];
    let currentMarksSum = 0;

    for (const q of shuffled) {
      if (selected.length < numQuestions && currentMarksSum + q.marks <= maxMarks) {
        selected.push(q);
        currentMarksSum += q.marks;
      }
    }

    // If selected is still empty because of too strict constraints, let's bypass maxMarks to ensure we have at least one question
    if (selected.length === 0 && pool.length > 0) {
      for (const q of shuffled) {
        if (selected.length < numQuestions) {
          selected.push(q);
          currentMarksSum += q.marks;
        }
      }
    }

    // If pool is small or empty, let's clone/seed standard questions dynamically to ensure a robust mock exam
    if (selected.length === 0) {
      // Fetch any matching subject question as fallback
      const fallbacks = questions.filter(q => q.subject === selectedSubject || q.subject === "CM1");
      selected = fallbacks.slice(0, Math.min(numQuestions, fallbacks.length));
      currentMarksSum = selected.reduce((sum, q) => sum + q.marks, 0);
    }

    setExamQuestions(selected);
    setCurrentQuestionIndex(0);

    // Initialize answer records
    const initialAnswers: Record<string, StudentAnswer> = {};
    selected.forEach(q => {
      initialAnswers[q.questionId] = {
        questionId: q.questionId,
        selectedMcqOption: null,
        writtenAnswer: "",
        flagged: false
      };
    });
    setStudentAnswers(initialAnswers);

    // Set duration
    if (durationMode === "timed") {
      let finalMinutes = 180;
      if (timeAdjustmentMode === "by-marks") {
        finalMinutes = Math.ceil(currentMarksSum * minsPerMark);
      } else if (timeAdjustmentMode === "by-questions") {
        finalMinutes = Math.ceil(selected.length * minsPerQuestion);
      } else {
        finalMinutes = customMinutes;
      }
      const seconds = finalMinutes * 60;
      setTimeLeft(seconds);
      setTotalExamDuration(seconds);
      setIsTimerRunning(true);
    } else {
      setTimeLeft(0);
      setTotalExamDuration(0);
      setIsTimerRunning(false);
    }

    setStep("exam");
    // Clear previous results
    setAiResult(null);
    setEvalInputText("");
    setSelectedFile(null);
    setFileBase64("");
  };

  const handleAutoSubmit = () => {
    alert("Time is up! Your mock exam has been submitted automatically.");
    handleSubmitExam();
  };

  const handleOptionSelect = (optionLetter: 'A' | 'B' | 'C' | 'D') => {
    const activeQ = examQuestions[currentQuestionIndex];
    if (!activeQ) return;

    setStudentAnswers(prev => ({
      ...prev,
      [activeQ.questionId]: {
        ...prev[activeQ.questionId],
        selectedMcqOption: optionLetter
      }
    }));
  };

  const handleWrittenAnswerChange = (val: string) => {
    const activeQ = examQuestions[currentQuestionIndex];
    if (!activeQ) return;

    setStudentAnswers(prev => ({
      ...prev,
      [activeQ.questionId]: {
        ...prev[activeQ.questionId],
        writtenAnswer: val
      }
    }));
  };

  const handleToggleFlag = () => {
    const activeQ = examQuestions[currentQuestionIndex];
    if (!activeQ) return;

    setStudentAnswers(prev => ({
      ...prev,
      [activeQ.questionId]: {
        ...prev[activeQ.questionId],
        flagged: !prev[activeQ.questionId].flagged
      }
    }));
  };

  // Submit Exam
  const handleSubmitExam = () => {
    setIsTimerRunning(false);
    
    // Auto populate evaluation input box with student's written answers formatted
    let formattedAnswers = "";
    examQuestions.forEach((q, idx) => {
      const ans = studentAnswers[q.questionId];
      formattedAnswers += `--- Question ${idx + 1} (${q.marks} Marks) ---\n`;
      formattedAnswers += `Chapter: ${q.chapter} | Topic: ${q.topic}\n`;
      formattedAnswers += `Question Text: ${q.question}\n\n`;
      formattedAnswers += `Student's Selected MCQ Option: ${ans?.selectedMcqOption || "None Selected"}\n`;
      formattedAnswers += `Student's Detailed Working/Answer:\n${ans?.writtenAnswer || "No working provided."}\n\n\n`;
    });
    setEvalInputText(formattedAnswers);

    setStep("results");
  };

  // Calculate local MCQ score
  const calculateMcqScore = () => {
    let score = 0;
    let totalQuestions = examQuestions.length;
    
    examQuestions.forEach(q => {
      const studentAns = studentAnswers[q.questionId]?.selectedMcqOption;
      if (studentAns === 'A') {
        score += 1; // Option A is correct in our mock options generator!
      }
    });

    return { score, totalQuestions };
  };

  const mcqStats = calculateMcqScore();

  // Create downloadable prompt / question file
  const handleDownloadPrompt = () => {
    let promptContent = `=== ACTUARIAL EXAM COMPILATION & GRADING SUITE ===\n`;
    promptContent += `Institute: ${selectedInstitute} | Subject: ${selectedSubject}\n`;
    promptContent += `Total Questions: ${examQuestions.length} | Target Max Marks: ${maxMarks}\n`;
    promptContent += `===============================================\n\n`;

    examQuestions.forEach((q, idx) => {
      const studentAns = studentAnswers[q.questionId];
      promptContent += `QUESTION ${idx + 1} [${q.marks} Marks]\n`;
      promptContent += `Chapter: ${q.chapter} | Topic: ${q.topic}\n`;
      promptContent += `Difficulty: ${q.difficulty} | Command Word: ${q.commandWord}\n`;
      promptContent += `Question Text:\n${q.question}\n\n`;
      promptContent += `---------------- Model Rubric ----------------\n`;
      promptContent += `Model Answer:\n${q.officialAnswer || "Refer to standard actuarial tables."}\n\n`;
      promptContent += `Mark Scheme Guide:\n${q.markScheme || "100% allocation for correct calculation logic."}\n\n`;
      promptContent += `---------------- Student Answer ----------------\n`;
      promptContent += `Selected MCQ Option: ${studentAns?.selectedMcqOption || "None"}\n`;
      promptContent += `Written Working:\n${studentAns?.writtenAnswer || "Not completed."}\n`;
      promptContent += `\n===============================================\n\n`;
    });

    promptContent += `\nINSTRUCTIONS FOR AI GRADING:\n`;
    promptContent += `Please act as a Senior Fellow of the Institute of Actuaries. Grade the student answers carefully, allocate marks per question, explain reasoning, and suggest remedial focus areas.\n`;

    const blob = new Blob([promptContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ActuaryVault_${selectedSubject}_Mock_Exam.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy full prompt
  const handleCopyPrompt = () => {
    let promptContent = `Actuarial Exam Grading Request:\n\n`;
    examQuestions.forEach((q, idx) => {
      const studentAns = studentAnswers[q.questionId];
      promptContent += `[QUESTION ${idx + 1}] (${q.marks} Marks)\n`;
      promptContent += `Question: ${q.question}\n`;
      promptContent += `Model Solution: ${q.officialAnswer || "N/A"}\n`;
      promptContent += `Mark Scheme: ${q.markScheme || "N/A"}\n`;
      promptContent += `Student's Answer: ${studentAns?.writtenAnswer || "N/A"}\n\n`;
    });
    
    navigator.clipboard.writeText(promptContent);
    alert("Prompt copied successfully! You can paste this to any external AI compiler to check, or submit directly below to evaluate immediately.");
  };

  // Handle student file upload for evaluation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // Get AI Assessment from backend
  const handleGetAIAssessment = async () => {
    setIsEvaluating(true);
    setEvalError(null);
    setAiResult(null);

    try {
      // Map questions to a cleaner schema for evaluation
      const compactQuestions = examQuestions.map(q => ({
        questionId: q.questionId,
        question: q.question,
        marks: q.marks,
        officialAnswer: q.officialAnswer,
        markScheme: q.markScheme,
        chapter: q.chapter,
        topic: q.topic
      }));

      const res = await fetch("/api/evaluate-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: compactQuestions,
          studentAnswersText: evalInputText,
          fileData: fileBase64 || null,
          fileName: selectedFile?.name || null,
          mimeType: selectedFile?.type || null
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to compile AI evaluation.");
      }

      const resultData = await res.json();
      setAiResult(resultData);
    } catch (err: any) {
      console.error(err);
      setEvalError(err.message || "An unexpected network error occurred while grading.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Timer format utility
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer color state
  const getTimerColorClass = () => {
    if (totalExamDuration === 0) return "text-sky-400";
    const ratio = timeLeft / totalExamDuration;
    if (ratio > 0.5) return "text-emerald-400 border-emerald-500/25";
    if (ratio > 0.2) return "text-amber-400 border-amber-500/25";
    return "text-rose-500 border-rose-500/25 animate-pulse";
  };

  const getTimerProgressPercent = () => {
    if (totalExamDuration === 0) return 0;
    return (timeLeft / totalExamDuration) * 100;
  };

  return (
    <div className="py-2 sm:py-6 px-4 max-w-7xl mx-auto text-slate-200">
      
      {/* HEADER CRUMB ROW */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded uppercase">
                Mock Portal
              </span>
              <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded">
                Interactive Suite
              </span>
            </div>
            <h3 className="font-display font-bold text-lg text-white mt-0.5">
              Continuous Exam Generator
            </h3>
          </div>
        </div>
      </div>

      {/* STEP A: CONFIGURATION SCREEN */}
      {step === "config" && (
        <div className="max-w-3xl mx-auto bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden backdrop-blur-lg">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Timer className="h-32 w-32 text-white" />
          </div>

          <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers className="h-6 w-6 text-sky-400" /> Assemble Actuarial Assessment
          </h2>

          <div className="space-y-6">

            {/* PRE-SELECTED CONTEXT CARD */}
            <div className="flex items-center justify-between p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-450 uppercase tracking-wider block">Contextually Inherited Subject & Body</span>
                <span className="text-lg font-bold text-sky-400 font-display flex items-center gap-2 mt-1">
                  {selectedInstitute} • {selectedSubject}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs bg-slate-950/65 px-3 py-1.5 border border-slate-800 rounded-xl text-slate-300 font-mono inline-block">
                  {selectedSubject === "CM1" ? "Financial Mathematics" :
                   selectedSubject === "CM2" ? "Financial Engineering" :
                   selectedSubject === "CS1" ? "Actuarial Statistics" :
                   selectedSubject === "CS2" ? "Risk Modelling" : "Syllabus Core"}
                </span>
              </div>
            </div>

            {/* 1. Mock Type Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">1. Structure Boundaries</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMockType("full")}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    mockType === "full"
                      ? "bg-sky-500/10 border-sky-500 text-white"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/40"
                  }`}
                >
                  <span className="font-display font-bold text-sm block text-white">Full Mock Exam</span>
                  <span className="text-xs text-slate-400 block mt-1 leading-relaxed">Generates a comprehensive exam paper based on the latest syllabus distribution.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMockType("chapters")}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    mockType === "chapters"
                      ? "bg-sky-500/10 border-sky-500 text-white"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/40"
                  }`}
                >
                  <span className="font-display font-bold text-sm block text-white">Particular Chapters/Units</span>
                  <span className="text-xs text-slate-400 block mt-1 leading-relaxed">Limit question selection to specific chapters you wish to drill.</span>
                </button>
              </div>
            </div>

            {/* Chapter Checklist (Conditional) */}
            {mockType === "chapters" && (
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 anim-fade-in space-y-2">
                <span className="text-xs font-semibold text-slate-400 block mb-2">Select Units to Include:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {currentChapterList.map((chap) => {
                    const isSelected = selectedChapters.includes(chap);
                    return (
                      <button
                        key={chap}
                        type="button"
                        onClick={() => handleToggleChapter(chap)}
                        className={`px-3 py-2 rounded-xl text-left text-xs font-medium transition flex items-center justify-between border cursor-pointer ${
                          isSelected
                            ? "bg-slate-800 border-sky-500 text-white"
                            : "bg-slate-900/20 border-slate-800/80 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>{chap}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                          isSelected ? "bg-sky-500 border-sky-400 text-slate-950" : "border-slate-700"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 stroke-[3px]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Number of Questions Selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">2. Number of Questions to Appear</label>
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">{numQuestions} Questions</span>
              </div>
              <input 
                type="range"
                min="1"
                max="25"
                step="1"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>1 Question</span>
                <span>12 Questions</span>
                <span>25 Questions</span>
              </div>
            </div>

            {/* 3. Target Marks Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">3. Maximum Marks Ceiling</label>
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">{maxMarks} Marks</span>
              </div>
              <input 
                type="range"
                min="10"
                max="120"
                step="5"
                value={maxMarks}
                onChange={(e) => setMaxMarks(parseInt(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>10 Marks</span>
                <span>65 Marks</span>
                <span>120 Marks</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
              {/* 4. Duration Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">4. Time Limit Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDurationMode("timed")}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border transition ${
                      durationMode === "timed"
                        ? "bg-sky-500/10 border-sky-500 text-sky-400"
                        : "bg-slate-950/40 border-slate-850 text-slate-400"
                    }`}
                  >
                    Timed Exam
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationMode("untimed")}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border transition ${
                      durationMode === "untimed"
                        ? "bg-sky-500/10 border-sky-500 text-sky-400"
                        : "bg-slate-950/40 border-slate-850 text-slate-400"
                    }`}
                  >
                    Untimed Sandbox
                  </button>
                </div>
              </div>

              {/* 5. Adaptive Timing Adjustment (Conditional on Timed) */}
              {durationMode === "timed" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">5. Adjust Time Limit By</label>
                  <div className="flex gap-1 bg-slate-950/40 border border-slate-850 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTimeAdjustmentMode("by-marks")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${
                        timeAdjustmentMode === "by-marks"
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Marks rate
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeAdjustmentMode("by-questions")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${
                        timeAdjustmentMode === "by-questions"
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Question rate
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeAdjustmentMode("custom")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${
                        timeAdjustmentMode === "custom"
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Manual Custom
                    </button>
                  </div>

                  {/* Sub-selectors depending on the chosen mode */}
                  <div className="mt-3 bg-slate-950/20 border border-slate-850/50 rounded-xl p-3">
                    {timeAdjustmentMode === "by-marks" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Minutes per Mark:</span>
                          <span className="font-bold text-sky-400">{minsPerMark} mins</span>
                        </div>
                        <div className="flex gap-1.5">
                          {[1.5, 1.8, 2.0].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setMinsPerMark(val)}
                              className={`flex-1 py-1 text-[10px] font-semibold border rounded ${
                                minsPerMark === val
                                  ? "bg-sky-500/15 border-sky-500 text-white"
                                  : "bg-slate-900/30 border-slate-800 text-slate-400"
                              }`}
                            >
                              {val}x
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-slate-500">
                          Estimated time: ~{Math.ceil(maxMarks * minsPerMark)} mins (adapts to actual compiled marks).
                        </p>
                      </div>
                    )}

                    {timeAdjustmentMode === "by-questions" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Minutes per Question:</span>
                          <span className="font-bold text-sky-400">{minsPerQuestion} mins</span>
                        </div>
                        <div className="flex gap-1.5">
                          {[5, 10, 15, 20].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setMinsPerQuestion(val)}
                              className={`flex-1 py-1 text-[10px] font-semibold border rounded ${
                                minsPerQuestion === val
                                  ? "bg-sky-500/15 border-sky-500 text-white"
                                  : "bg-slate-900/30 border-slate-800 text-slate-400"
                              }`}
                            >
                              {val}m
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-slate-500">
                          Estimated time: ~{Math.ceil(numQuestions * minsPerQuestion)} mins (adapts to actual compiled questions).
                        </p>
                      </div>
                    )}

                    {timeAdjustmentMode === "custom" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Exact Duration:</span>
                          <span className="font-bold text-sky-400">{customMinutes} minutes</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="240"
                          step="10"
                          value={customMinutes}
                          onChange={(e) => setCustomMinutes(parseInt(e.target.value))}
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>10m</span>
                          <span>120m</span>
                          <span>240m</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions button */}
            <div className="pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleStartExam}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-display font-extrabold text-base tracking-wide shadow-xl shadow-sky-500/5 hover:shadow-sky-500/10 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="h-5 w-5 fill-current" /> Compile & Launch Live Mock
              </button>
              <p className="text-[10px] text-center font-mono text-slate-500 mt-2">
                Pre-compiling exam paper based on syllabus distribution models...
              </p>
            </div>

          </div>
        </div>
      )}

      {/* STEP B: LIVE MOCK EXAM INTERFACE */}
      {step === "exam" && examQuestions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left / Info & Progress sidebar */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Countdown Clock / Progress status */}
            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Time State</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                  {durationMode === "timed" ? "Standard Session" : "Untimed Sandbox"}
                </span>
              </div>

              {durationMode === "timed" ? (
                <div className={`p-4 rounded-xl border bg-slate-950/40 text-center relative overflow-hidden ${getTimerColorClass()}`}>
                  {/* Timer Progress Bar */}
                  <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all duration-1000" style={{ width: `${getTimerProgressPercent()}%` }} />
                  <span className="text-3xl font-mono font-extrabold tracking-widest block">{formatTime(timeLeft)}</span>
                  <span className="text-[10px] uppercase font-mono block mt-1 text-slate-400">Remaining Session Limit</span>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-slate-400">
                  <Clock className="h-8 w-8 mx-auto text-slate-500 mb-2" />
                  <span className="text-sm font-semibold">Unlimited Study Mode</span>
                </div>
              )}

              {/* Exam overall metrics */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono border-t border-slate-800 pt-3">
                <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-slate-400 block text-[10px] uppercase">Marks Count</span>
                  <span className="font-bold text-white text-sm">{examQuestions.reduce((acc, curr) => acc + curr.marks, 0)}</span>
                </div>
                <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-slate-400 block text-[10px] uppercase">Total Qs</span>
                  <span className="font-bold text-white text-sm">{examQuestions.length}</span>
                </div>
              </div>
            </div>

            {/* Questions Tracker Shortcuts Grid */}
            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Question Navigator</span>
              
              <div className="grid grid-cols-5 gap-2">
                {examQuestions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isFlagged = studentAnswers[q.questionId]?.flagged;
                  const hasMcqAnswered = studentAnswers[q.questionId]?.selectedMcqOption !== null;
                  const hasWrittenAnswered = studentAnswers[q.questionId]?.writtenAnswer.trim() !== "";

                  let statusColor = "bg-slate-900 text-slate-400 border-slate-800";
                  if (hasMcqAnswered || hasWrittenAnswered) {
                    statusColor = "bg-sky-500/10 text-sky-400 border-sky-500/30";
                  }
                  if (isFlagged) {
                    statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                  }
                  if (isCurrent) {
                    statusColor = "bg-sky-500 text-slate-950 border-sky-400 font-bold";
                  }

                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-10 rounded-lg border text-xs font-mono transition flex flex-col items-center justify-center relative cursor-pointer ${statusColor}`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-sky-500/10 border border-sky-500/30" /> Answered
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/30" /> Flagged
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800" /> Unattempted
                </div>
              </div>
            </div>

            {/* Submission triggers */}
            <button
              onClick={handleSubmitExam}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white font-semibold text-sm transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Finalize & Submit Exam
            </button>
          </div>

          {/* Right / Question Card Arena */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Active Question Panel */}
            {examQuestions[currentQuestionIndex] && (
              <div className="bg-slate-900/40 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-lg overflow-hidden">
                
                {/* Panel Header */}
                <div className="bg-[#0b1329] p-5 border-b border-slate-850 flex flex-wrap items-center justify-between gap-3 text-white">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-sky-400 font-bold tracking-wider uppercase bg-slate-800 px-2.5 py-1 rounded-lg">
                      Question {currentQuestionIndex + 1} of {examQuestions.length}
                    </span>
                    <span className="font-mono text-xs text-indigo-400 font-bold tracking-wider uppercase bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                      {examQuestions[currentQuestionIndex].marks} Marks
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleFlag}
                      className={`p-2 rounded-lg border text-xs font-mono transition flex items-center gap-1 ${
                        studentAnswers[examQuestions[currentQuestionIndex].questionId]?.flagged
                          ? "bg-amber-500/20 border-amber-500 text-amber-400"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" /> 
                      {studentAnswers[examQuestions[currentQuestionIndex].questionId]?.flagged ? "Flagged" : "Flag for review"}
                    </button>
                  </div>
                </div>

                {/* Question Premise Section */}
                <div className="p-6 border-b border-slate-800 bg-slate-900/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Question Premise</span>
                    <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-md">
                      {examQuestions[currentQuestionIndex].chapter} • {examQuestions[currentQuestionIndex].topic}
                    </span>
                  </div>
                  
                  <div className="text-slate-100 text-base font-medium leading-relaxed font-sans whitespace-pre-line bg-slate-950/40 rounded-2xl p-5 border border-slate-800/65">
                    {examQuestions[currentQuestionIndex].question}
                  </div>
                </div>

                {/* MCQ Options Selector section */}
                <div className="p-6 border-b border-slate-800 space-y-4 bg-slate-950/20">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <HelpCircle className="h-4 w-4 text-sky-400" /> Options for MCQs (Select the best choice)
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {getMcqOptionsForQuestion(examQuestions[currentQuestionIndex]).map((opt) => {
                      const isSelected = studentAnswers[examQuestions[currentQuestionIndex].questionId]?.selectedMcqOption === opt.letter;
                      return (
                        <button
                          key={opt.letter}
                          onClick={() => handleOptionSelect(opt.letter)}
                          className={`w-full p-4 rounded-xl border text-left transition relative group flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? "bg-sky-500/10 border-sky-500 text-white shadow-lg"
                              : "bg-slate-900/40 border-slate-800 text-slate-350 hover:bg-slate-800/50 hover:text-white"
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? "bg-sky-500 text-slate-950 border-sky-400"
                              : "bg-slate-950 text-slate-400 border-slate-800 group-hover:border-slate-700"
                          }`}>
                            {opt.letter}
                          </div>
                          <span className="text-sm font-medium leading-relaxed">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Written working box */}
                <div className="p-6 space-y-3 bg-slate-900/5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Detailed Working, Calculations & Written Explanation</label>
                  <textarea
                    rows={5}
                    placeholder="Enter mathematical derivation steps, actuarial formulas, or textual explanations here to evaluate with AI..."
                    value={studentAnswers[examQuestions[currentQuestionIndex].questionId]?.writtenAnswer || ""}
                    onChange={(e) => handleWrittenAnswerChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-800 text-sm bg-slate-950/60 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 font-mono">
                    Feel free to draft LaTeX equations or bullet outlines. We will analyze your full conceptual accuracy on the grading dashboard.
                  </p>
                </div>

                {/* Footer question switcher */}
                <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="h-4 w-4 inline mr-1" /> Previous Question
                  </button>

                  <button
                    disabled={currentQuestionIndex === examQuestions.length - 1}
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                  >
                    Next Question <ChevronRight className="h-4 w-4 inline ml-1" />
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* STEP C: RESULTS, DOWNLOADS, AND AI GRADING ASSESSMENTS */}
      {step === "results" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {/* 1. Header scorecard summary row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* MCQ Stats Summary */}
            <div className="bg-[#090f1d] border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-2 flex flex-col justify-center items-center">
              <Award className="h-10 w-10 text-sky-400 mb-1" />
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block">MCQ Selection Score</span>
              <span className="text-4xl font-extrabold text-white block">
                {mcqStats.score} <span className="text-xl text-slate-500">/ {mcqStats.totalQuestions}</span>
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                Based on automated instant multi-choice matching. (Option A is standard target solution).
              </p>
            </div>

            {/* Question File & Copy prompt generator */}
            <div className="bg-[#090f1d] border border-slate-800 rounded-3xl p-6 shadow-xl col-span-1 md:col-span-2 space-y-4">
              <div>
                <h4 className="font-display font-bold text-base text-white">Question File & Copy Prompt</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  We have consolidated your exam paper, selected MCQ answers, typed working drafts, and model rubrics into a standardized container prompt. You can copy this or download the text file to check elsewhere.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleCopyPrompt}
                  className="px-4 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 font-medium text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="h-4 w-4" /> Copy Structured Prompt
                </button>
                <button
                  onClick={handleDownloadPrompt}
                  className="px-4 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 font-medium text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" /> Download Exam Package (.txt)
                </button>
              </div>
            </div>

          </div>

          {/* 2. MCQ Question detailed reviews list */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" /> MCQ Key Checking Review
            </h3>

            <div className="space-y-4">
              {examQuestions.map((q, idx) => {
                const ans = studentAnswers[q.questionId];
                const isCorrect = ans?.selectedMcqOption === 'A';
                const options = getMcqOptionsForQuestion(q);
                const selectedOptText = options.find(o => o.letter === ans?.selectedMcqOption)?.text || "None selected";
                const correctOptText = options.find(o => o.letter === 'A')?.text || "";

                return (
                  <div key={q.questionId} className="p-4 rounded-2xl bg-slate-950/45 border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-bold text-slate-400">Question {idx + 1} ({q.marks} Marks)</span>
                      <div className="flex items-center gap-1.5">
                        {ans?.selectedMcqOption === null ? (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded uppercase">Unanswered</span>
                        ) : isCorrect ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                            <Check className="h-3 w-3 stroke-[3px]" /> Correct
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                            <X className="h-3 w-3 stroke-[3px]" /> Incorrect
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-medium font-sans">{q.question}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
                      <div className="bg-slate-900/30 p-2 rounded border border-slate-850">
                        <span className="text-slate-500 block text-[9px] uppercase">Your Pick</span>
                        <span className={`text-[11px] ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ans?.selectedMcqOption || "None"} - {selectedOptText}
                        </span>
                      </div>
                      <div className="bg-slate-900/30 p-2 rounded border border-slate-850">
                        <span className="text-slate-500 block text-[9px] uppercase">Correct Key</span>
                        <span className="text-[11px] text-emerald-400">
                          A - {correctOptText}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. AI Assessment Portal (Real server-side Gemini integration) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Sparkles className="h-24 w-24 text-sky-400" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono uppercase font-bold mb-2">
                Server-Side Gemini AI
              </div>
              <h3 className="font-display font-extrabold text-xl text-white">Full AI-Powered Actuarial Grading Suite</h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                "Students can just add their word/ excel file and get it checked with AI - we save tokens." Upload your completed math worksheet, text paper, excel dump, or revise your response draft in the workspace below. Our server-side model evaluates your derivation logic and awards marks.
              </p>
            </div>

            <div className="space-y-4">
              
              {/* Submission text-area */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace Draft / Compiled Responses</label>
                <textarea
                  rows={8}
                  placeholder="Review or paste your final answers here..."
                  value={evalInputText}
                  onChange={(e) => setEvalInputText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-800 text-sm bg-slate-950/60 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* Drag and Drop File Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Upload Word, Excel, PDF, or Plain Text Submission File</label>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-sky-500/50 bg-slate-950/20 hover:bg-slate-950/40 rounded-2xl p-6 text-center cursor-pointer transition relative group"
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".doc,.docx,.xls,.xlsx,.pdf,.txt,.csv"
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 mx-auto text-slate-500 group-hover:text-sky-400 mb-2 transition" />
                  
                  {selectedFile ? (
                    <div>
                      <span className="text-sm font-semibold text-white block">{selectedFile.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB) - Loaded Successfully</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-semibold text-slate-300 block">Click to select answer sheet file</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Accepts Word (.docx), Excel (.xlsx), PDF, CSV or plain text</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action trigger button */}
              <button
                onClick={handleGetAIAssessment}
                disabled={isEvaluating}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Analyzing Math logic & Grading Solutions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 fill-current" /> Grade with ActuaryVault AI
                  </>
                )}
              </button>

              {/* Error warning */}
              {evalError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-rose-400 block">Evaluation Compilation Failed</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{evalError}</p>
                  </div>
                </div>
              )}

            </div>

            {/* Render grading scoreboard dashboard if evaluated */}
            {aiResult && (
              <div className="border-t border-slate-800 pt-6 mt-6 space-y-6 anim-slide-down">
                
                {/* 1. Scorecard main bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-slate-950/40 p-6 rounded-3xl border border-slate-850">
                  
                  <div className="text-center sm:text-left space-y-1">
                    <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest block font-bold">Actuarial Grade Card</span>
                    <h4 className="font-display font-extrabold text-2xl text-white">AI Examiner Assessment</h4>
                    <p className="text-xs text-slate-400">Formal syllabus feedback compiled successfully.</p>
                  </div>

                  <div className="text-center py-4 bg-slate-900/30 rounded-2xl border border-slate-800 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Awarded Marks</span>
                    <span className="text-5xl font-extrabold text-white tracking-tighter mt-1 block">
                      {aiResult.overallScore}
                    </span>
                    <span className="text-xs font-mono text-slate-500">out of {aiResult.maxMarks}</span>
                  </div>

                  <div className="text-center sm:text-left p-4">
                    <span className="text-xs font-bold text-slate-300 block mb-1">Result Status</span>
                    {aiResult.overallScore >= aiResult.maxMarks * 0.6 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                        <CheckCircle className="h-3 w-3" /> PASS PREP LIMIT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                        <AlertCircle className="h-3 w-3" /> RETRIAL RECOMMENDED
                      </span>
                    )}
                  </div>

                </div>

                {/* 2. General Comments */}
                <div className="bg-slate-950/20 border border-slate-850 p-5 rounded-2xl space-y-2">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">Examiner-in-Chief Report Comments</span>
                  <p className="text-sm text-slate-300 italic leading-relaxed whitespace-pre-line font-sans">
                    "{aiResult.generalComments}"
                  </p>
                </div>

                {/* 3. Question by Question detailed feedback list */}
                <div className="space-y-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Detailed Question Breakdowns</span>
                  
                  {aiResult.feedback.map((feed, idx) => {
                    const originalQ = examQuestions.find(eq => eq.questionId === feed.questionId) || examQuestions[idx];
                    
                    return (
                      <div key={feed.questionId || idx} className="p-5 rounded-2xl bg-slate-900/10 border border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-2">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            Question {idx + 1} ({feed.maxMarks || originalQ?.marks} Marks)
                          </span>
                          <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                            Awarded: {feed.marksAwarded} / {feed.maxMarks || originalQ?.marks} Marks
                          </span>
                        </div>

                        {originalQ && (
                          <p className="text-xs text-slate-400 italic line-clamp-1">
                            Premise: "{originalQ.question}"
                          </p>
                        )}

                        <div className="space-y-2 text-xs leading-relaxed">
                          <div>
                            <span className="text-slate-400 font-bold block mb-0.5">Examiner Remarks:</span>
                            <p className="text-slate-200 font-sans">{feed.comments}</p>
                          </div>

                          {feed.keyMissedConcepts && (
                            <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
                              <span className="text-rose-400 font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Key Missed Concepts:</span>
                              <p className="text-rose-250 font-sans">{feed.keyMissedConcepts}</p>
                            </div>
                          )}

                          {feed.remedialAdvice && (
                            <div className="p-3 bg-sky-500/5 rounded-xl border border-sky-500/10">
                              <span className="text-sky-400 font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Study Recommendation:</span>
                              <p className="text-sky-250 font-sans">{feed.remedialAdvice}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>

          {/* Bottom Back selection triggers */}
          <div className="text-center pt-4">
            <button
              onClick={() => setStep("config")}
              className="px-6 py-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-200 font-semibold text-xs transition cursor-pointer"
            >
              Configure / Generate Another Mock Exam
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
