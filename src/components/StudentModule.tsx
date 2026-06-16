import React, { useState, useEffect } from "react";
import { Question, ExamBodyType, StudyModeType, SubjectType } from "../types";
import { 
  ChevronRight, ArrowLeft, Filter, BookOpen, Shuffle, FileText, 
  HelpCircle, Sparkles, Award, Layers, ThumbsUp, Bookmark, 
  CheckCircle, RefreshCw, Eye, Star, Compass, Clock 
} from "lucide-react";

interface StudentModuleProps {
  questions: Question[];
  favorites: string[]; // List of questionIds
  onToggleFavorite: (id: string) => void;
}

export default function StudentModule({ 
  questions, 
  favorites, 
  onToggleFavorite 
}: StudentModuleProps) {
  // State variables
  const [selectedBody, setSelectedBody] = useState<ExamBodyType | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<StudyModeType | null>(null);
  
  // Chapter-wise mode states
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [diffFilter, setDiffFilter] = useState<string>("all");
  const [marksFilter, setMarksFilter] = useState<string>("all");
  const [isPastPaperOnly, setIsPastPaperOnly] = useState<boolean>(false);
  const [isRephrasedOnly, setIsRephrasedOnly] = useState<boolean>(false);
  const [isFreqAskedOnly, setIsFreqAskedOnly] = useState<boolean>(false);
  const [isUnattemptedOnly, setIsUnattemptedOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Attempted tracker in standard client state cache
  const [attemptedQuestionIds, setAttemptedQuestionIds] = useState<string[]>([]);
  
  // Active Question Viewer states
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [isRevealedAI, setIsRevealedAI] = useState<boolean>(false);
  const [isRevealedOfficial, setIsRevealedOfficial] = useState<boolean>(false);
  const [isRevealedMarking, setIsRevealedMarking] = useState<boolean>(false);
  const [isRevealedExaminer, setIsRevealedExaminer] = useState<boolean>(false);
  const [useRephrasedView, setUseRephrasedView] = useState<boolean>(false);

  // Mixed Practice mode states
  const [mixedBatch, setMixedBatch] = useState<Question[]>([]);
  const [mixedIndex, setMixedIndex] = useState<number>(0);

  // Past Paper selector states
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  // Core list of standard actuarial chapters to dynamically render
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

  // Extract chapters or fallback for general subjects
  const currentChapterList = selectedSubject 
    ? (chaptersMap[selectedSubject] || chaptersMap["CP1"]) 
    : [];

  const handleSelectQuestion = (q: Question) => {
    setActiveQuestion(q);
    setIsRevealedAI(false);
    setIsRevealedOfficial(false);
    setIsRevealedMarking(false);
    setIsRevealedExaminer(false);
    setUseRephrasedView(false);

    // Add to cache of clicked/viewed questions (track attempted)
    if (!attemptedQuestionIds.includes(q.questionId)) {
      setAttemptedQuestionIds(prev => [...prev, q.questionId]);
    }
  };

  // Reset parameters when backing out of subject
  const resetSubjectSelection = () => {
    setSelectedSubject(null);
    setSelectedMode(null);
    setSelectedChapter(null);
    setSelectedTerm(null);
    setActiveQuestion(null);
  };

  // Generate Mixed Practice Test Batch from matching questions
  const startMixedPractice = () => {
    if (!selectedSubject) return;
    const sameSubjectQuestions = questions.filter(
      q => q.status === "approved" && 
      (q.examBody === selectedBody) &&
      (q.subject === selectedSubject || (selectedSubject === "SP" && q.subject.startsWith("SP")) || (selectedSubject === "SA" && q.subject.startsWith("SA")))
    );

    // Shuffle and pick max 5 questions
    const shuffled = [...sameSubjectQuestions].sort(() => 0.5 - Math.random());
    const slice = shuffled.slice(0, 5);

    if (slice.length > 0) {
      setMixedBatch(slice);
      setMixedIndex(0);
      handleSelectQuestion(slice[0]);
    } else {
      setMixedBatch([]);
      setActiveQuestion(null);
    }
  };

  useEffect(() => {
    if (selectedMode === "mixed") {
      startMixedPractice();
    }
  }, [selectedMode, selectedSubject, selectedBody]);

  // Dynamic filtering of questions for Chapter-wise list
  const getFilteredQuestions = () => {
    if (!selectedSubject) return [];

    let list = questions.filter(
      q => q.status === "approved" &&
      q.examBody === selectedBody &&
      (q.subject === selectedSubject || (selectedSubject === "SP" && q.subject.startsWith("SP")) || (selectedSubject === "SA" && q.subject.startsWith("SA")))
    );

    // Filter by Chapter if any selected
    if (selectedChapter) {
      list = list.filter(q => q.chapter.toLowerCase() === selectedChapter.toLowerCase());
    }

    // Keyword search
    if (searchTerm.trim() !== "") {
      const kw = searchTerm.toLowerCase();
      list = list.filter(
        q => q.question.toLowerCase().includes(kw) || 
        q.topic.toLowerCase().includes(kw) || 
        q.chapter.toLowerCase().includes(kw) ||
        (q.commandWord && q.commandWord.toLowerCase().includes(kw)) ||
        (q.term && q.term.toLowerCase().includes(kw))
      );
    }

    // Difficulty filter
    if (diffFilter !== "all") {
      list = list.filter(q => q.difficulty.toLowerCase() === diffFilter.toLowerCase());
    }

    // Marks filter
    if (marksFilter !== "all") {
      if (marksFilter === "low") {
        list = list.filter(q => q.marks <= 5);
      } else if (marksFilter === "medium") {
        list = list.filter(q => q.marks > 5 && q.marks <= 10);
      } else if (marksFilter === "high") {
        list = list.filter(q => q.marks > 10);
      }
    }

    // Past paper check
    if (isPastPaperOnly) {
      list = list.filter(q => q.term !== undefined && q.term !== "");
    }

    // AI Rephrased check
    if (isRephrasedOnly) {
      list = list.filter(q => q.rephrasedQuestion !== undefined && q.rephrasedQuestion !== "");
    }

    // Frequently Asked (Mocking high frequency for ones withmarks > 10 or specifically flagged)
    if (isFreqAskedOnly) {
      list = list.filter(q => q.marks >= 12 || q.difficulty === "Hard");
    }

    // Unattempted check
    if (isUnattemptedOnly) {
      list = list.filter(q => !attemptedQuestionIds.includes(q.questionId));
    }

    return list;
  };

  const filteredQuestions = getFilteredQuestions();

  // Past papers list mapping
  const availableTerms = ["Nov 2025", "Apr 2025", "Nov 2024", "Apr 2024"];

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto text-slate-200">
      
      {/* 1. SECTOR SELECTOR LANDING SCREEN */}
      {!selectedBody ? (
        <div className="text-center py-12 max-w-md mx-auto" id="auth-landing">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full text-xs font-mono font-medium mb-4 uppercase tracking-wider">
            <Sparkles className="h-3 w-3 animate-pulse" /> Actuarial Learning Matrix
          </div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight sm:text-4xl mb-3">
            Choose Your Exam Body
          </h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Select standard guidelines aligned to either the Institute and Faculty of Actuaries (UK) or Institute of Actuaries of India structure.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setSelectedBody("IFOA")}
              className="group relative flex items-center justify-between p-6 rounded-2xl bg-[#0B1222] hover:bg-[#0F172A] border-2 border-slate-800 hover:border-sky-500 transition duration-300 shadow-sm cursor-pointer hover:shadow-sky-500/5 text-left"
            >
              <div>
                <span className="font-display font-bold text-xl text-white group-hover:text-sky-400 transition">
                  IFOA Prep Vault
                </span>
                <p className="text-xs text-slate-400 mt-1">Institute and Faculty of Actuaries (UK syllabus)</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-sky-500 text-slate-400 group-hover:text-slate-950 flex items-center justify-center transition">
                <ChevronRight className="h-5 w-5" />
              </div>
            </button>

            <button
              onClick={() => setSelectedBody("IAI")}
              className="group relative flex items-center justify-between p-6 rounded-2xl bg-[#0B1222] hover:bg-[#0F172A] border-2 border-slate-800 hover:border-sky-500 transition duration-300 shadow-sm cursor-pointer hover:shadow-sky-500/5 text-left"
            >
              <div>
                <span className="font-display font-bold text-xl text-white group-hover:text-sky-400 transition">
                  IAI Prep Vault
                </span>
                <p className="text-xs text-slate-400 mt-1">Institute of Actuaries of India (IAI core syllabus)</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-sky-500 text-slate-400 group-hover:text-slate-950 flex items-center justify-center transition">
                <ChevronRight className="h-5 w-5" />
              </div>
            </button>
          </div>
        </div>
      ) : (
        
        <div>
          {/* Header breadcrumb row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (activeQuestion && selectedMode !== "mixed") {
                    setActiveQuestion(null);
                  } else {
                    resetSubjectSelection();
                    setSelectedBody(null);
                  }
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded uppercase">
                    {selectedBody}
                  </span>
                  {selectedSubject && (
                    <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded">
                      Subject {selectedSubject}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-lg text-white mt-0.5">
                  {selectedSubject ? `${selectedBody} / Subject ${selectedSubject}` : `Actuarial Subject Guide`}
                </h3>
              </div>
            </div>

            {selectedSubject && (
              <button
                onClick={resetSubjectSelection}
                className="text-xs font-medium text-slate-400 hover:text-sky-400 flex items-center gap-1 transition"
              >
                <RefreshCw className="h-3 w-3" /> Change Subject
              </button>
            )}
          </div>

          {/* 2. SUBJECT SELECTION WINDOW */}
          {!selectedSubject ? (
            <div>
              <h2 className="text-2xl font-display font-bold text-white tracking-tight mb-5">
                Select Your Exam Subject
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {["CM1", "CM2", "CS1", "CS2", "CB1", "CB2", "CP1", "CP2", "CP3", "SP", "SA"].map((sub) => {
                  const subjectQuestionsCount = questions.filter(
                    q => q.status === "approved" && 
                    q.examBody === selectedBody &&
                    (q.subject === sub || (sub === "SP" && q.subject.startsWith("SP")) || (sub === "SA" && q.subject.startsWith("SA")))
                  ).length;

                  return (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubject(sub)}
                      className="group flex flex-col justify-between p-5 rounded-2xl bg-[#0B1222] border border-slate-800 hover:border-slate-700 hover:bg-[#0F172A]/85 text-left transition duration-300 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <div className="mb-6">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold tracking-tight font-display mb-3 border border-slate-850">
                          {sub}
                        </div>
                        <span className="font-display font-semibold text-base text-slate-200 group-hover:text-white transition">
                          {sub === "CM1" && "Actuarial Mathematics"}
                          {sub === "CM2" && "Financial Engineering"}
                          {sub === "CS1" && "Actuarial Statistics"}
                          {sub === "CS2" && "Risk Modelling"}
                          {sub === "CB1" && "Business Finance"}
                          {sub === "CB2" && "Business Economics"}
                          {sub === "CP1" && "Actuarial Practice"}
                          {sub === "CP2" && "Modelling Practice"}
                          {sub === "CP3" && "Actuarial Comm"}
                          {sub === "SP" && "Specialist Principles"}
                          {sub === "SA" && "Specialist Advanced"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>{subjectQuestionsCount} questions available</span>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white transition" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            
            /* 3. PRACTICE MODES SCREEN */
            <div>
              {!selectedMode ? (
                <div className="max-w-4xl mx-auto py-6">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-display font-bold text-white">Select Practice Mode</h2>
                    <p className="text-slate-400 text-sm mt-1">Pick a customized learning trajectory tailored to your exam preparation</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Chapter Wise Card */}
                    <button
                      onClick={() => {
                        setSelectedMode("chapter-wise");
                        setSelectedChapter(null);
                      }}
                      className="group p-6 rounded-2xl bg-[#0B1222] border border-slate-800 hover:border-sky-500 hover:shadow-lg transition duration-300 cursor-pointer text-left flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 flex items-center justify-center transition mb-5 border border-sky-500/20">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <h3 className="font-display font-bold text-lg text-white group-hover:text-sky-400 transition">Chapter Wise</h3>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                          Concentrate on core syllabus areas individually (e.g. Life Tables or ALM). Highly organized revision with advanced filters.
                        </p>
                      </div>
                      <div className="mt-8 flex items-center text-xs font-semibold text-sky-400 uppercase tracking-wider">
                        <span>Browse Chapters</span> <ChevronRight className="ml-1 h-4 w-4" />
                      </div>
                    </button>

                    {/* Mixed Practice Card */}
                    <button
                      onClick={() => setSelectedMode("mixed")}
                      className="group p-6 rounded-2xl bg-[#0B1222] border border-slate-800 hover:border-indigo-500 hover:shadow-lg transition duration-300 cursor-pointer text-left flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center transition mb-5 border border-indigo-500/20">
                          <Shuffle className="h-6 w-6" />
                        </div>
                        <h3 className="font-display font-bold text-lg text-white group-hover:text-indigo-400 transition">Mixed Practice</h3>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                          Zero chapter boundaries. Pulls a customized randomized block of practice questions across the entire curriculum.
                        </p>
                      </div>
                      <div className="mt-8 flex items-center text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                        <span>Start Mixed Quiz</span> <ChevronRight className="ml-1 h-4 w-4" />
                      </div>
                    </button>

                    {/* Past Papers Mode */}
                    <button
                      onClick={() => setSelectedMode("past-papers")}
                      className="group p-6 rounded-2xl bg-[#0B1222] border border-slate-800 hover:border-emerald-500 hover:shadow-lg transition duration-300 cursor-pointer text-left flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center transition mb-5 border border-emerald-500/20">
                          <FileText className="h-6 w-6" />
                        </div>
                        <h3 className="font-display font-bold text-lg text-white group-hover:text-emerald-400 transition">Past Papers</h3>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                          Follow the actual historical paper timelines. Perfect to practice complete exams under mock exam specifications.
                        </p>
                      </div>
                      <div className="mt-8 flex items-center text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        <span>Select Paper Term</span> <ChevronRight className="ml-1 h-4 w-4" />
                      </div>
                    </button>
                  </div>
                </div>
              ) : (

                /* 4. ACTIVE PRACTICE STUDY MODULE VIEWPORTS */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT NAVIGATION PANEL (DIFFERS BASED ON STUDY MODE TYPE) */}
                  <div className="lg:col-span-4 bg-[#0B1222] rounded-2xl border border-slate-800 p-4 shadow-sm">
                    {/* Header bar and toggle key */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                      <span className="font-display font-medium text-sm text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="h-4 w-4 text-sky-400" />
                        {selectedMode === "chapter-wise" && "Chapter Index"}
                        {selectedMode === "mixed" && "Random Playlist"}
                        {selectedMode === "past-papers" && "Official Series"}
                      </span>
                      <button 
                        onClick={() => {
                          setSelectedMode(null);
                          setActiveQuestion(null);
                        }}
                        className="text-xs font-semibold text-sky-450 hover:text-sky-400 hover:underline"
                      >
                        Reset Mode
                      </button>
                    </div>

                    {/* CASE A: CHAPTER WISE LEFT NAV */}
                    {selectedMode === "chapter-wise" && (
                      <div className="space-y-4">
                        {/* Chapters selection drawer */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] mb-2">Select Chapter</label>
                          <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                            <button
                              onClick={() => {
                                setSelectedChapter(null);
                                setActiveQuestion(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                                selectedChapter === null 
                                  ? "bg-sky-500 text-slate-950 font-bold" 
                                  : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800/80"
                              }`}
                            >
                              All Curriculum Chapters
                            </button>
                            {currentChapterList.map((chap) => (
                              <button
                                key={chap}
                                onClick={() => {
                                  setSelectedChapter(chap);
                                  setActiveQuestion(null);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                                  selectedChapter === chap
                                    ? "bg-sky-500 text-slate-950 font-bold"
                                    : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800/80"
                                }`}
                              >
                                <span>{chap}</span>
                                <span className={`text-[10px] ${selectedChapter === chap ? "text-slate-900 font-bold" : "text-slate-400 opacity-75"}`}>
                                  ({questions.filter(q => q.chapter === chap && q.status === "approved" && q.examBody === selectedBody).length})
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* FILTER ACCORDION CONSOLE */}
                        <div className="border-t border-slate-800 pt-3">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1 mb-2">
                            <Filter className="h-3.5 w-3.5 text-slate-400" /> Filters
                          </span>

                          <div className="space-y-3">
                            {/* Search Keyword */}
                            <div>
                              <input 
                                type="text"
                                placeholder="Search keyword..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-800 text-xs bg-[#0F172A] text-slate-100 focus:outline-none focus:border-sky-500"
                              />
                            </div>

                            {/* Difficulty */}
                            <div className="flex gap-1.5">
                              <select
                                value={diffFilter}
                                onChange={(e) => setDiffFilter(e.target.value)}
                                className="w-1/2 p-2 rounded-lg border border-slate-800 text-xs bg-[#0F172A] text-slate-100 focus:outline-none focus:border-sky-500"
                              >
                                <option value="all">Diff: All</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>

                              {/* Marks */}
                              <select
                                value={marksFilter}
                                onChange={(e) => setMarksFilter(e.target.value)}
                                className="w-1/2 p-2 rounded-lg border border-slate-800 text-xs bg-[#0F172A] text-slate-100 focus:outline-none focus:border-sky-500"
                              >
                                <option value="all">Marks: All</option>
                                <option value="low">≤ 5 Marks</option>
                                <option value="medium">6 - 10 Marks</option>
                                <option value="high">&gt; 10 Marks</option>
                              </select>
                            </div>

                            {/* Boolean Toggles Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-slate-300 bg-slate-900 border border-slate-800/80 p-1.5 rounded-lg select-none hover:bg-slate-800 transition">
                                <input 
                                  type="checkbox" 
                                  checked={isPastPaperOnly}
                                  onChange={(e) => setIsPastPaperOnly(e.target.checked)}
                                  className="rounded text-sky-500 focus:ring-0 h-3 w-3"
                                />
                                <span>Past Paper</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-slate-300 bg-slate-900 border border-slate-800/80 p-1.5 rounded-lg select-none hover:bg-slate-800 transition">
                                <input 
                                  type="checkbox" 
                                  checked={isRephrasedOnly}
                                  onChange={(e) => setIsRephrasedOnly(e.target.checked)}
                                  className="rounded text-sky-500 focus:ring-0 h-3 w-3"
                                />
                                <span>AI Rephrased</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-slate-300 bg-slate-900 border border-slate-800/80 p-1.5 rounded-lg select-none hover:bg-slate-800 transition">
                                <input 
                                  type="checkbox" 
                                  checked={isFreqAskedOnly}
                                  onChange={(e) => setIsFreqAskedOnly(e.target.checked)}
                                  className="rounded text-sky-500 focus:ring-0 h-3 w-3"
                                />
                                <span>Frequently Asked</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-slate-300 bg-slate-900 border border-slate-800/80 p-1.5 rounded-lg select-none hover:bg-slate-800 transition">
                                <input 
                                  type="checkbox" 
                                  checked={isUnattemptedOnly}
                                  onChange={(e) => setIsUnattemptedOnly(e.target.checked)}
                                  className="rounded text-sky-500 focus:ring-0 h-3 w-3"
                                />
                                <span>Unattempted Only</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* LIST OF ACCESSIBLE QUESTIONS UNDER FILTERS */}
                        <div className="border-t border-slate-800 pt-3">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <span>Questions matched ({filteredQuestions.length})</span>
                          </div>

                          {filteredQuestions.length === 0 ? (
                            <div className="text-center py-6 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400">
                              No questions found matching criteria
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1">
                              {filteredQuestions.map((q) => {
                                const isFav = favorites.includes(q.questionId);
                                const isAttempted = attemptedQuestionIds.includes(q.questionId);

                                return (
                                  <button
                                    key={q.questionId}
                                    onClick={() => handleSelectQuestion(q)}
                                    className={`w-full text-left p-3 rounded-xl border text-xs transition duration-200 hover:shadow-sm ${
                                      activeQuestion?.questionId === q.questionId
                                        ? "border-sky-500 bg-sky-500/10 text-white"
                                        : "border-slate-800/80 hover:border-slate-700 bg-slate-900/40 text-slate-300"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                      <span className="font-mono text-[9px] text-slate-400 uppercase">
                                        {q.term || q.topic}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {isAttempted && (
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Attempted" />
                                        )}
                                        {isFav && (
                                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                        )}
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                          q.difficulty === "Easy" ? "bg-emerald-500/15 text-emerald-300" :
                                          q.difficulty === "Medium" ? "bg-amber-500/15 text-amber-300" :
                                          "bg-rose-500/15 text-rose-300"
                                        }`}>
                                          {q.difficulty}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="font-medium text-slate-100 line-clamp-2">
                                      {q.question}
                                    </p>
                                    <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 font-mono">
                                      <span>Marks: {q.marks}</span>
                                      <span>{q.commandWord}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CASE B: MIXED PRACTICE NAVIGATION */}
                    {selectedMode === "mixed" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/15 text-xs text-indigo-200">
                          <p className="font-medium mb-1.5 flex items-center gap-1"><Shuffle className="h-3.5 w-3.5 text-indigo-400" /> Core Mixed Practice</p>
                          <p className="text-[11px] leading-relaxed opacity-90">
                            We have randomly compiled 5 custom questions spanning the subject. Finish the practice blocks sequentially to evaluate your syllabus retention.
                          </p>
                        </div>

                        {mixedBatch.length === 0 ? (
                          <div className="text-center py-6 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400">
                            No matching questions found in Firestore dataset to compile mixed list
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Practice Timeline</span>
                            <div className="flex flex-col gap-1.5">
                              {mixedBatch.map((q, idx) => {
                                const isActive = activeQuestion?.questionId === q.questionId;
                                return (
                                  <button
                                    key={q.questionId}
                                    onClick={() => {
                                      setMixedIndex(idx);
                                      handleSelectQuestion(q);
                                    }}
                                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition flex items-center justify-between ${
                                      isActive 
                                        ? "bg-sky-500 text-slate-950 border-sky-500 shadow font-bold" 
                                        : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] opacity-70">0{idx + 1}.</span>
                                      <span className="truncate max-w-[170px]">{q.chapter}</span>
                                    </span>
                                    <span className="font-mono text-[9px]">{q.marks}M</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE C: PAST PAPERS NAVIGATION */}
                    {selectedMode === "past-papers" && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Paper Term</label>
                          <div className="grid grid-cols-2 gap-2">
                            {availableTerms.map((termOption) => {
                              const examCount = questions.filter(
                                q => q.term === termOption && 
                                q.examBody === selectedBody && 
                                (q.subject === selectedSubject || (selectedSubject === "SP" && q.subject.startsWith("SP")) || (selectedSubject === "SA" && q.subject.startsWith("SA"))) &&
                                q.status === "approved"
                              ).length;

                              return (
                                <button
                                  key={termOption}
                                  onClick={() => {
                                    setSelectedTerm(termOption);
                                    setActiveQuestion(null);
                                  }}
                                  className={`p-3 rounded-xl border text-xs font-medium transition duration-200 text-left ${
                                    selectedTerm === termOption
                                      ? "bg-sky-500 text-slate-950 border-sky-500 font-bold"
                                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                  }`}
                                >
                                  <div className="font-bold flex items-center gap-1">
                                    <Clock className={`h-3 w-3 ${selectedTerm === termOption ? "text-slate-950" : "text-sky-400"}`} /> {termOption}
                                  </div>
                                  <p className={`text-[10px] mt-1 ${selectedTerm === termOption ? "text-slate-850" : "text-slate-400"}`}>{examCount} questions</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {selectedTerm && (
                          <div className="border-t border-slate-800 pt-3">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-display">Questions in {selectedTerm}</span>
                            
                            {questions.filter(
                              q => q.term === selectedTerm && 
                              q.examBody === selectedBody && 
                              (q.subject === selectedSubject || (selectedSubject === "SP" && q.subject.startsWith("SP")) || (selectedSubject === "SA" && q.subject.startsWith("SA"))) &&
                              q.status === "approved"
                            ).length === 0 ? (
                              <div className="text-center py-6 bg-slate-900/45 border border-slate-800 rounded-xl text-xs text-slate-400">
                                This paper term has no uploaded questions yet
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                                {questions
                                  .filter(
                                    q => q.term === selectedTerm && 
                                    q.examBody === selectedBody && 
                                    (q.subject === selectedSubject || (selectedSubject === "SP" && q.subject.startsWith("SP")) || (selectedSubject === "SA" && q.subject.startsWith("SA"))) &&
                                    q.status === "approved"
                                  )
                                  .map((q, idx) => (
                                    <button
                                      key={q.questionId}
                                      onClick={() => handleSelectQuestion(q)}
                                      className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition ${
                                        activeQuestion?.questionId === q.questionId
                                          ? "border-sky-500 bg-sky-500/10 text-white"
                                          : "border-slate-800/80 bg-slate-900/40 text-slate-350 hover:border-slate-700"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1.5 font-mono">
                                        <span>Question {idx + 1}</span>
                                        <span>{q.marks} Marks</span>
                                      </div>
                                      <p className="font-semibold text-slate-200 line-clamp-2">{q.question}</p>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT SCREEN CORE QUESTION VIEWER DETAIL */}
                  <div className="lg:col-span-8 space-y-6">
                    {!activeQuestion ? (
                      <div className="bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 text-center py-20 px-6 backdrop-blur-md">
                        <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800/80 flex items-center justify-center mx-auto mb-4 text-slate-400">
                          <HelpCircle className="h-8 w-8 text-sky-400" />
                        </div>
                        <h3 className="font-display font-semibold text-xl text-slate-100">Select an Actuarial Question</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                          Choose any syllabus question from the left navigation or chapter index to view answers, mark schemes, and examiner reports.
                        </p>
                      </div>
                    ) : (
                      
                      <div className="bg-slate-900/40 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-lg overflow-hidden anim-fade-in">
                        {/* Question Viewer Title Header block */}
                        <div className="bg-[#0b1329] p-5 sm:p-6 text-white border-b border-slate-850">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-sky-400 font-bold tracking-wider uppercase bg-slate-800 px-2.5 py-1 rounded-lg">
                                {activeQuestion.subject} Unit
                              </span>
                              {activeQuestion.term && (
                                <span className="font-mono text-xs text-slate-300 font-bold bg-slate-800 px-2.5 py-1 rounded-lg">
                                  {activeQuestion.term} Exam
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Bookmarked toggle */}
                              <button
                                onClick={() => onToggleFavorite(activeQuestion.questionId)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition"
                                title="Bookmark Question"
                              >
                                <Bookmark className={`h-4.5 w-4.5 ${favorites.includes(activeQuestion.questionId) ? "text-amber-400 fill-amber-400" : ""}`} />
                              </button>
                              
                              <span className="font-mono text-xs text-slate-400">
                                Marks: <strong className="text-white text-sm font-black">{activeQuestion.marks}M</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-350 font-mono">
                            <span>Chapter: <strong className="text-slate-200">{activeQuestion.chapter}</strong></span>
                            <span>•</span>
                            <span>Topic: <strong className="text-slate-200">{activeQuestion.topic}</strong></span>
                            <span>•</span>
                            <span>Command Word: <strong className="text-sky-300">{activeQuestion.commandWord}</strong></span>
                          </div>
                        </div>

                        {/* Question Text & optional AI Rephrase slider */}
                        <div className="p-6 border-b border-slate-800 bg-slate-900/10">
                          {activeQuestion.rephrasedQuestion && (
                            <div className="flex items-center justify-between mb-4 bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl text-xs">
                              <span className="text-slate-400 font-medium flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-sky-400 animate-pulse" /> AI Safe Rephrase Variant Available
                              </span>
                              <div className="flex bg-slate-950 border border-slate-800/60 rounded-lg p-0.5">
                                <button
                                  onClick={() => setUseRephrasedView(false)}
                                  className={`px-3 py-1 rounded text-[11px] font-semibold transition ${
                                    !useRephrasedView ? "bg-slate-850 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                                  }`}
                                >
                                  Original
                                </button>
                                <button
                                  onClick={() => setUseRephrasedView(true)}
                                  className={`px-3 py-1 rounded text-[11px] font-semibold transition ${
                                    useRephrasedView ? "bg-slate-850 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                                  }`}
                                >
                                  Rephrased
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Question Premise</span>
                            <div className="text-slate-150 text-base font-medium leading-relaxed font-sans whitespace-pre-line bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60">
                              {useRephrasedView && activeQuestion.rephrasedQuestion 
                                ? activeQuestion.rephrasedQuestion 
                                : activeQuestion.question}
                            </div>
                          </div>
                        </div>

                        {/* REVEAL SOLUTIONS DRAWER CONSOLE */}
                        <div className="p-6 space-y-4">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-display">Solution Explanations</span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Card 1: Reveal AI Solution */}
                            <button
                              onClick={() => setIsRevealedAI(!isRevealedAI)}
                              className={`p-4 rounded-2xl border text-left transition duration-250 cursor-pointer ${
                                isRevealedAI 
                                  ? "bg-indigo-500/15 border-indigo-500/50 text-white shadow-lg" 
                                  : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 text-slate-300 hover:text-slate-100"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <Sparkles className="h-5 w-5 text-sky-400 animate-pulse" />
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isRevealedAI ? "bg-indigo-500/30 text-indigo-200" : "bg-sky-500/15 text-sky-300"}`}>
                                  AI Solution
                                </span>
                              </div>
                              <span className="font-display font-semibold text-sm">Detailed Solution</span>
                              <p className="text-[10px] text-slate-450 mt-1">{isRevealedAI ? "Hide notes" : "Click to reveal"}</p>
                            </button>

                            {/* Card 2: Reveal Official Solution */}
                            <button
                              onClick={() => {
                                if (activeQuestion.officialAnswer) {
                                  setIsRevealedOfficial(!isRevealedOfficial);
                                }
                              }}
                              disabled={!activeQuestion.officialAnswer}
                              className={`p-4 rounded-2xl border text-left transition duration-250 ${
                                !activeQuestion.officialAnswer ? "opacity-35 cursor-not-allowed bg-slate-950/25 border-slate-900 text-slate-500" :
                                isRevealedOfficial 
                                  ? "bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg" 
                                  : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 text-slate-300 hover:text-slate-100 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <Award className="h-5 w-5 text-emerald-400" />
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isRevealedOfficial ? "bg-emerald-500/30 text-emerald-250" : "bg-emerald-500/15 text-emerald-300"}`}>
                                  Official
                                </span>
                              </div>
                              <span className="font-display font-semibold text-sm">Official Answer</span>
                              <p className="text-[10px] text-slate-450 mt-1">
                                {!activeQuestion.officialAnswer ? "Unavailable" : isRevealedOfficial ? "Hide notes" : "Click to reveal"}
                              </p>
                            </button>

                            {/* Card 3: Reveal Marking Scheme */}
                            <button
                              onClick={() => {
                                if (activeQuestion.markScheme) {
                                  setIsRevealedMarking(!isRevealedMarking);
                                }
                              }}
                              disabled={!activeQuestion.markScheme}
                              className={`p-4 rounded-2xl border text-left transition duration-250 ${
                                !activeQuestion.markScheme ? "opacity-35 cursor-not-allowed bg-slate-950/25 border-slate-900 text-slate-500" :
                                isRevealedMarking 
                                  ? "bg-teal-500/15 border-teal-500/50 text-white shadow-lg" 
                                  : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 text-slate-300 hover:text-slate-100 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <Layers className="h-5 w-5 text-teal-400" />
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isRevealedMarking ? "bg-teal-500/30 text-teal-250" : "bg-teal-500/15 text-teal-300"}`}>
                                  Syllabus
                                </span>
                              </div>
                              <span className="font-display font-semibold text-sm">Marking Scheme</span>
                              <p className="text-[10px] text-slate-450 mt-1">
                                {!activeQuestion.markScheme ? "Unavailable" : isRevealedMarking ? "Hide notes" : "Click to reveal"}
                              </p>
                            </button>

                            {/* Card 4: Reveal Examiner Report */}
                            <button
                              onClick={() => {
                                if (activeQuestion.examinerReport) {
                                  setIsRevealedExaminer(!isRevealedExaminer);
                                }
                              }}
                              disabled={!activeQuestion.examinerReport}
                              className={`p-4 rounded-2xl border text-left transition duration-250 ${
                                !activeQuestion.examinerReport ? "opacity-35 cursor-not-allowed bg-slate-950/25 border-slate-900 text-slate-500" :
                                isRevealedExaminer 
                                  ? "bg-orange-500/15 border-orange-500/50 text-white shadow-lg" 
                                  : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 text-slate-300 hover:text-slate-100 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <FileText className="h-5 w-5 text-orange-450" />
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isRevealedExaminer ? "bg-orange-500/30 text-orange-250" : "bg-orange-500/15 text-orange-350"}`}>
                                  Examiner
                                </span>
                              </div>
                              <span className="font-display font-semibold text-sm">Examiner Report</span>
                              <p className="text-[10px] text-slate-450 mt-1">
                                {!activeQuestion.examinerReport ? "Unavailable" : isRevealedExaminer ? "Hide notes" : "Click to reveal"}
                              </p>
                            </button>
                          </div>

                          {/* DETAILS ACCORDION RENDER EXPLANATIONS */}
                          <div className="space-y-4 pt-4 border-t border-slate-800">
                            {/* AI Solution Content */}
                            {isRevealedAI && (
                              <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-900/60 anim-slide-down">
                                <h4 className="flex items-center gap-1.5 font-display font-bold text-slate-100 text-base mb-3 border-b border-indigo-900/40 pb-2">
                                  <Sparkles className="h-5 w-5 text-sky-400" /> Detailed Explanations & AI Solution
                                </h4>
                                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line italic bg-slate-950/40 p-4 rounded-xl border border-indigo-900/10">
                                  {activeQuestion.aiSolution || "Our actuarial models are parsing this explanation."}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                  {activeQuestion.keyPoints && (
                                    <div className="bg-sky-500/5 border border-sky-500/10 p-4 rounded-xl">
                                      <span className="text-[11px] font-bold text-sky-300 uppercase tracking-widest block mb-2">Expanded Key Concepts</span>
                                      <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                                        {activeQuestion.keyPoints}
                                      </div>
                                    </div>
                                  )}
                                  {activeQuestion.commonMistakes && (
                                    <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl">
                                      <span className="text-[11px] font-bold text-rose-300 uppercase tracking-widest block mb-2">Common Mistakes</span>
                                      <div className="text-xs text-rose-200 whitespace-pre-line leading-relaxed font-medium">
                                        {activeQuestion.commonMistakes}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Official Answer Content */}
                            {isRevealedOfficial && activeQuestion.officialAnswer && (
                              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-900/60 anim-slide-down">
                                <h4 className="flex items-center gap-1.5 font-display font-bold text-slate-100 text-base mb-3 border-b border-emerald-900/40 pb-2">
                                  <Award className="h-5 w-5 text-emerald-400" /> Official Model Answer
                                </h4>
                                <div className="text-slate-300 text-sm font-mono whitespace-pre-line leading-relaxed bg-slate-950/40 p-4 border border-emerald-900/10 rounded-xl">
                                  {activeQuestion.officialAnswer}
                                </div>
                              </div>
                            )}

                            {/* Marking Scheme Content */}
                            {isRevealedMarking && activeQuestion.markScheme && (
                              <div className="p-5 rounded-2xl bg-teal-950/20 border border-teal-900/60 anim-slide-down">
                                <h4 className="flex items-center gap-1.5 font-display font-bold text-slate-100 text-base mb-3 border-b border-teal-900/40 pb-2">
                                  <Layers className="h-5 w-5 text-teal-450" /> Marking Key & Expectations Allocation
                                </h4>
                                <div className="text-slate-300 text-sm whitespace-pre-line leading-relaxed bg-slate-950/40 p-4 border border-teal-900/10 rounded-xl font-medium">
                                  {activeQuestion.markScheme}
                                </div>
                              </div>
                            )}

                            {/* Examiner Report Content */}
                            {isRevealedExaminer && activeQuestion.examinerReport && (
                              <div className="p-5 rounded-2xl bg-orange-950/20 border border-orange-900/60 anim-slide-down">
                                <h4 className="flex items-center gap-1.5 font-display font-bold text-slate-100 text-base mb-3 border-b border-orange-900/40 pb-2">
                                  <FileText className="h-5 w-5 text-orange-450" /> Official Examiner Report Comments
                                </h4>
                                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-950/40 p-4 border border-orange-900/10 rounded-xl italic">
                                  {activeQuestion.examinerReport}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
