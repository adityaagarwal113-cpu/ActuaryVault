import React, { useState, useEffect } from "react";
import { Question, ExamBodyType, SubjectType, DifficultyType, PastPaperPdf } from "../types";
import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { 
  Upload, CheckCircle, AlertTriangle, Trash2, Edit2, Check, X, 
  Layers, Award, BarChart3, Users, Clock, Percent, Shield, Sparkles, Save, RefreshCw, ChevronDown, BookOpen, Link2,
  ArrowUp, ArrowDown, Plus
} from "lucide-react";

interface AdminPanelProps {
  questions: Question[];
  pastPapers?: PastPaperPdf[];
  onRefreshDatabase: () => void;
  onRefreshPastPapers?: () => void;
}

const DEFAULT_SUBJECTS = [
  { code: "CM1", name: "Actuarial Mathematics", desc: "Interest theory, life tables, reserves, and life contingency calculations." },
  { code: "CM2", name: "Financial Engineering", desc: "Capital structure, portfolio theory, derivatives, and asset-liability matching." },
  { code: "CS1", name: "Actuarial Statistics", desc: "Probability distributions, Bayesian estimation, and regression models." },
  { code: "CS2", name: "Risk Modelling", desc: "Stochastic processes, Markov chains, extreme value theory, and time series." },
  { code: "CB1", name: "Business Finance", desc: "Corporate governance, financial reporting, and capital structure decisions." },
  { code: "CB2", name: "Business Economics", desc: "Microeconomics, macroeconomic policy, monetary policy, and bond trading." },
  { code: "CP1", name: "Actuarial Practice", desc: "Strategic risk frameworks, solvency management, and investment principles." },
  { code: "CP2", name: "Modelling Practice", desc: "Actuarial model construction, Excel auditing, and sensitivity analysis." },
  { code: "CP3", name: "Actuarial Communication", desc: "Mathematical concept simplification and non-technical explanations." },
  { code: "SP", name: "Specialist Principles", desc: "Advanced risk modeling, specialized pension, and investment derivatives." },
  { code: "SA", name: "Specialist Advanced", desc: "Strategic capital allocation, reinsurance policies, and business strategy." }
];

const DEFAULT_CHAPTERS: Record<string, string[]> = {
  "CM1": [
    "Actuarial Modelling & Cash Flow",
    "Time Value of Money & Interest Rates",
    "Real & Money Interest Rates",
    "Discounting & Accumulating",
    "Level & Varying Annuities",
    "Equations of Value",
    "Loan Schedules & Mortgages",
    "Project Appraisal & Valuations",
    "Investments & Asset Valuation",
    "Simple Mortality & Survival Models",
    "Life Tables & Selection Mortality",
    "Life Assurance Contracts",
    "Life Annuities Contracts",
    "Net Premium & Policy Reserving",
    "Gross Premiums & Provisions",
    "Joint Life & Contingency States",
    "Multiple Decrement Models",
    "Pension Funds & Benefits Models"
  ],
  "CM2": [
    "Financial Market Behaviour",
    "Utility Theory",
    "Stochastic Dominance",
    "Mean-Variance Portfolio Theory",
    "Capital Asset Models (CAPM & APT)",
    "Cash Flows & Stochastic Interest",
    "Efficient Markets Hypothesis",
    "Stochastic Return Models",
    "Brownian Motion & Martingales",
    "Stochastic Calculus & Ito's Lemma",
    "Black-Scholes Option Pricing",
    "Greeks & Hedging Strategies",
    "Binomial Tree Option Models",
    "Term Structure of Interest Rates",
    "Credit Risk & Default Models",
    "Run-off Loss Reserving (Chain-Ladder)"
  ],
  "CS1": [
    "Exploratory Data Analysis",
    "Probability Theory & Venn Diagrams",
    "Discrete & Continuous Distributions",
    "Joint & Conditional Distributions",
    "Expectations & Moment Generating Functions",
    "Central Limit Theorem & Sampling Distributions",
    "Point Estimation & Methods",
    "Confidence Intervals",
    "Hypothesis Testing Principles",
    "Correlation & Association",
    "Simple Linear Regression",
    "Generalised Linear Models (GLMs)",
    "Bayesian Statistics & Credibility"
  ],
  "CS2": [
    "Survival & Mortality Rate Modelling",
    "Hazard Rates & Life Tables",
    "Markov Chains (Discrete State/Time)",
    "Markov Jump Processes (Continuous Time)",
    "Two-State Transition Intensities",
    "Survival Analysis & Estimators (K-M & Nelson-Aalen)",
    "Cox Proportional Hazards Regression",
    "Stochastic Generalised Linear Modelling",
    "Extreme Value Theory (EVT)",
    "Copulas & Dependent Risks",
    "Time Series Models (AR, MA, ARMA, ARIMA)",
    "Run-off Loss Reserving Methods"
  ],
  "CB1": ["Corporate Governance", "Balance Sheet Analysis", "Accounting Principles", "Corporate Financing", "Capital Allocation"],
  "CB2": ["Microeconomics Analysis", "Macroeconomics Policies", "Fiscal Budgets", "Monetary Policy", "Inflation & Trading Bonds"],
  "CP1": ["Risk Management Framework", "Solvency Systems", "Syllabus Governance", "Capital Management", "Investment Strategies"],
  "CP2": ["Actuarial Modelling Procedures", "Documentation Specifications", "Excel Audit Framework", "Sensitivity Analyses"],
  "CP3": ["Professional Communication", "Explanation of Mathematical Concepts", "Jargon Elimination"],
  "SP": ["Asset Liability Matching", "Stochastic Modelling", "Investments & Derivatives", "State Superannuation", "Pension Scheme Management", "Solvency Capital Requirement"],
  "SA": ["Strategic Corporate Capitalization", "Enterprise Risk Management", "Longevity Risk Hedging", "Group Reinsurance Strategy"]
};

export default function AdminPanel({ 
  questions, 
  pastPapers = [], 
  onRefreshDatabase, 
  onRefreshPastPapers 
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "review" | "manager" | "analytics" | "users" | "syllabus">("upload");
  
  // Syllabus & Subjects Dynamic State
  const [subjectsList, setSubjectsList] = useState<any[]>(DEFAULT_SUBJECTS);
  const [chaptersMap, setChaptersMap] = useState<Record<string, string[]>>(DEFAULT_CHAPTERS);
  const [loadingSyllabus, setLoadingSyllabus] = useState<boolean>(true);
  
  // Selected subject to edit/view chapters
  const [selectedSyllabusSubject, setSelectedSyllabusSubject] = useState<string>("CM1");
  const [syllabusNameInput, setSyllabusNameInput] = useState<string>("");
  const [syllabusDescInput, setSyllabusDescInput] = useState<string>("");
  const [syllabusChaptersInput, setSyllabusChaptersInput] = useState<string>("");
  
  // Form for creating a new subject
  const [showNewSubjectForm, setShowNewSubjectForm] = useState<boolean>(false);
  const [newSubjectCode, setNewSubjectCode] = useState<string>("");
  const [newSubjectName, setNewSubjectName] = useState<string>("");
  const [newSubjectDesc, setNewSubjectDesc] = useState<string>("");
  const [newSubjectChapters, setNewSubjectChapters] = useState<string>("");

  // Visual vs Raw Chapters Editor state
  const [editorMode, setEditorMode] = useState<"visual" | "raw">("visual");
  const [syllabusChaptersArray, setSyllabusChaptersArray] = useState<string[]>([]);
  const [editingChapterIndex, setEditingChapterIndex] = useState<number | null>(null);
  const [editingChapterText, setEditingChapterText] = useState<string>("");
  const [newChapterInput, setNewChapterInput] = useState<string>("");

  const updateVisualChapters = (newArray: string[]) => {
    setSyllabusChaptersArray(newArray);
    setSyllabusChaptersInput(newArray.join("\n"));
  };

  const handleRawChaptersChange = (val: string) => {
    setSyllabusChaptersInput(val);
    const parsed = val.split("\n").map(c => c.trim()).filter(c => c.length > 0);
    setSyllabusChaptersArray(parsed);
  };

  const handleAddChapterVisual = () => {
    const val = newChapterInput.trim();
    if (!val) return;
    if (syllabusChaptersArray.includes(val)) {
      setUploadStatus({ type: "error", message: "Chapter already exists in this syllabus." });
      return;
    }
    const updated = [...syllabusChaptersArray, val];
    updateVisualChapters(updated);
    setNewChapterInput("");
  };

  const handleDeleteChapterVisual = (index: number) => {
    const updated = syllabusChaptersArray.filter((_, idx) => idx !== index);
    updateVisualChapters(updated);
  };

  const handleMoveChapterUpVisual = (index: number) => {
    if (index === 0) return;
    const updated = [...syllabusChaptersArray];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    updateVisualChapters(updated);
  };

  const handleMoveChapterDownVisual = (index: number) => {
    if (index === syllabusChaptersArray.length - 1) return;
    const updated = [...syllabusChaptersArray];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    updateVisualChapters(updated);
  };

  const handleStartEditChapter = (index: number, text: string) => {
    setEditingChapterIndex(index);
    setEditingChapterText(text);
  };

  const handleSaveEditChapter = (index: number) => {
    const val = editingChapterText.trim();
    if (!val) return;
    const updated = [...syllabusChaptersArray];
    updated[index] = val;
    updateVisualChapters(updated);
    setEditingChapterIndex(null);
    setEditingChapterText("");
  };

  const handleCancelEditChapter = () => {
    setEditingChapterIndex(null);
    setEditingChapterText("");
  };

  const fetchSyllabusConfig = async () => {
    try {
      setLoadingSyllabus(true);
      const querySnapshot = await getDocs(collection(db, "subjects"));
      const fetched: any[] = [];
      const newChaptersMap = { ...DEFAULT_CHAPTERS };
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetched.push({
          code: data.subject,
          name: data.name || data.subject,
          desc: data.desc || `Syllabus mapping and question pool for ${data.subject}.`,
          chapters: data.chapters || []
        });
        newChaptersMap[data.subject] = data.chapters || [];
      });

      const merged = [...DEFAULT_SUBJECTS];
      fetched.forEach((f) => {
        const index = merged.findIndex(m => m.code === f.code);
        if (index !== -1) {
          merged[index] = { ...merged[index], name: f.name, desc: f.desc };
        } else {
          merged.push({ code: f.code, name: f.name, desc: f.desc });
        }
      });
      
      setSubjectsList(merged);
      setChaptersMap(newChaptersMap);
    } catch (err) {
      console.error("Error loading custom subjects:", err);
    } finally {
      setLoadingSyllabus(false);
    }
  };

  useEffect(() => {
    fetchSyllabusConfig();
  }, []);

  useEffect(() => {
    const currentSubject = subjectsList.find(s => s.code === selectedSyllabusSubject);
    if (currentSubject) {
      setSyllabusNameInput(currentSubject.name);
      setSyllabusDescInput(currentSubject.desc);
      const currentChapters = chaptersMap[selectedSyllabusSubject] || [];
      setSyllabusChaptersInput(currentChapters.join("\n"));
      setSyllabusChaptersArray(currentChapters);
    } else {
      setSyllabusNameInput("");
      setSyllabusDescInput("");
      setSyllabusChaptersInput("");
      setSyllabusChaptersArray([]);
    }
  }, [selectedSyllabusSubject, subjectsList, chaptersMap]);

  // Subject Creation, Editing, & Deletion handlers
  const handleCreateNewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newSubjectCode.trim().toUpperCase();
    const cleanName = newSubjectName.trim();
    const cleanDesc = newSubjectDesc.trim();
    
    if (!cleanCode || !cleanName) {
      setUploadStatus({ type: "error", message: "Subject code and title are required." });
      return;
    }

    const cleanChapters = newSubjectChapters
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    try {
      setProcessing(true);
      await setDoc(doc(db, "subjects", cleanCode), {
        subject: cleanCode,
        name: cleanName,
        desc: cleanDesc || `Syllabus mapping and question pool for ${cleanCode}.`,
        chapters: cleanChapters,
        createdAt: new Date().toISOString()
      });

      setNewSubjectCode("");
      setNewSubjectName("");
      setNewSubjectDesc("");
      setNewSubjectChapters("");
      setShowNewSubjectForm(false);
      setSelectedSyllabusSubject(cleanCode);

      setUploadStatus({ type: "success", message: `Subject ${cleanCode} created successfully!` });
      await fetchSyllabusConfig();
    } catch (err: any) {
      console.error("Error creating subject:", err);
      setUploadStatus({ type: "error", message: `Failed to create subject: ${err.message}` });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = syllabusNameInput.trim();
    const cleanDesc = syllabusDescInput.trim();

    if (!cleanName) {
      setUploadStatus({ type: "error", message: "Subject title is required." });
      return;
    }

    const cleanChapters = syllabusChaptersInput
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    try {
      setProcessing(true);
      await setDoc(doc(db, "subjects", selectedSyllabusSubject), {
        subject: selectedSyllabusSubject,
        name: cleanName,
        desc: cleanDesc,
        chapters: cleanChapters,
        updatedAt: new Date().toISOString()
      });

      setUploadStatus({ type: "success", message: `Subject ${selectedSyllabusSubject} configuration saved!` });
      await fetchSyllabusConfig();
    } catch (err: any) {
      console.error("Error saving syllabus:", err);
      setUploadStatus({ type: "error", message: `Failed to save configuration: ${err.message}` });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteSyllabusSubject = async (subjectCode: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the subject ${subjectCode} and all its chapters?`)) {
      return;
    }

    try {
      setProcessing(true);
      await deleteDoc(doc(db, "subjects", subjectCode));
      
      setSelectedSyllabusSubject("CM1");
      setUploadStatus({ type: "success", message: `Subject ${subjectCode} removed successfully!` });
      await fetchSyllabusConfig();
    } catch (err: any) {
      console.error("Error deleting subject:", err);
      setUploadStatus({ type: "error", message: `Failed to delete subject: ${err.message}` });
    } finally {
      setProcessing(false);
    }
  };

  // Data State
  const [examBody, setExamBody] = useState<ExamBodyType>("IFOA");
  const [subject, setSubject] = useState<string>("CM1");
  const [rephraseMode, setRephraseMode] = useState<"Original Only" | "Safe Rephrase" | "Original + Rephrase">("Safe Rephrase");
  const [termText, setTermText] = useState<string>("Apr 2025");

  // States for Past Paper PDF upload
  const [paperBody, setPaperBody] = useState<ExamBodyType>("IFOA");
  const [paperSubject, setPaperSubject] = useState<string>("CM1");
  const [paperTerm, setPaperTerm] = useState<string>("Apr 2025");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrlInput, setPdfUrlInput] = useState<string>("");
  const [linkingPdf, setLinkingPdf] = useState<boolean>(false);
  const [linkingStatus, setLinkingStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      setLinkingStatus(null);
    }
  };

  const handleLinkPdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile && !pdfUrlInput.trim()) {
      setLinkingStatus({ type: "error", message: "Please either upload a PDF file or enter a direct PDF URL." });
      return;
    }

    setLinkingPdf(true);
    setLinkingStatus(null);

    const paperId = `${paperBody.toLowerCase()}_${paperSubject.toLowerCase()}_${paperTerm.replace(/\s+/g, "_").toLowerCase()}`;

    try {
      let finalPdfUrl = pdfUrlInput.trim();

      if (pdfFile) {
        // Read file as Base64 data URL
        const reader = new FileReader();
        reader.readAsDataURL(pdfFile);
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file."));
        });

        // Save on the server to bypass any Firestore 1MB limits entirely
        const uploadResponse = await fetch("/api/upload-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: pdfFile.name,
          }),
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          throw new Error(uploadError.error || "Failed to upload PDF file to server.");
        }

        const uploadResult = await uploadResponse.json();
        finalPdfUrl = uploadResult.pdfUrl;
      }

      await setDoc(doc(db, "past_papers", paperId), {
        id: paperId,
        examBody: paperBody,
        subject: paperSubject,
        term: paperTerm,
        pdfUrl: finalPdfUrl,
        uploadedAt: new Date().toISOString()
      });

      setLinkingStatus({ type: "success", message: `Successfully linked PDF to past paper ${paperBody} ${paperSubject} - ${paperTerm}!` });
      setPdfFile(null);
      setPdfUrlInput("");
      if (onRefreshPastPapers) {
        onRefreshPastPapers();
      }
    } catch (err: any) {
      console.error(err);
      setLinkingStatus({ type: "error", message: err.message || "An error occurred while linking the PDF." });
    } finally {
      setLinkingPdf(false);
    }
  };

  const handleDeletePaperPdf = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this linked PDF?")) return;
    try {
      await deleteDoc(doc(db, "past_papers", id));
      if (onRefreshPastPapers) {
        onRefreshPastPapers();
      }
    } catch (err: any) {
      console.error("Failed to delete past paper PDF:", err);
    }
  };

  // Question Bank Manager Filters
  const [managerSubject, setManagerSubject] = useState<string>("CM1");
  const [managerInstitute, setManagerInstitute] = useState<string>("IFOA");

  // Ingestion File States
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<Question[]>([]);

  // Review Queue Editing States
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Stats computation
  const pendingCount = questions.filter(q => q.status === "pending").length;
  const approvedCount = questions.filter(q => q.status === "approved").length;

  // Handle local text or PDF base64 conversion & processing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      setUploadStatus({ type: "error", message: "Please select a file to upload first." });
      return;
    }

    setProcessing(true);
    setUploadStatus(null);
    setExtractedPreview([]);

    try {
      // 1. Read file as Base64 Client-Side
      const reader = new FileReader();
      reader.readAsDataURL(uploadedFile);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        // 2. Call our Express Full-Stack Server-Side Gemini Extraction endpoint
        const response = await fetch("/api/process-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: uploadedFile.name,
            mimeType: uploadedFile.type || "application/pdf",
            examBody,
            subject,
            rephraseMode,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to process upload with Gemini.");
        }

        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          // Add custom properties like term, examBody, subject and upload date
          const processedQuestions: Question[] = data.questions.map((q: any, idx: number) => ({
            ...q,
            questionId: `ingest-${Date.now()}-${idx}`,
            examBody,
            subject,
            uploadDate: new Date().toISOString(),
            status: (q.confidenceScore || 95) > 90 ? "approved" : "pending",
            term: termText,
          }));

          // Send them straight into Firestore Database dynamically
          let savedCount = 0;
          let queueCount = 0;
          
          for (const q of processedQuestions) {
            await addDoc(collection(db, "questions"), q);
            if (q.status === "approved") savedCount++;
            else queueCount++;
          }

          setExtractedPreview(processedQuestions);
          onRefreshDatabase();

          setUploadStatus({
            type: "success",
            message: `Ingestion successful! Extracted ${processedQuestions.length} question(s). ${savedCount} auto-approved (Confidence >90%). ${queueCount} sent to Review Queue (Confidence <90%).`
          });
        } else {
          throw new Error("No structured questions could be extracted by Gemini. Try standard higher quality papers.");
        }
        setProcessing(false);
      };

      reader.onerror = () => {
        throw new Error("Failed to read selected file on client.");
      };

    } catch (err: any) {
      console.error(err);
      setUploadStatus({ type: "error", message: err.message || "An exception occurred during pipeline execution." });
      setProcessing(false);
    }
  };

  // Actions on Review Queue
  const handleApprove = async (q: Question) => {
    try {
      // Find document in Firestore matching this questionId
      const querySnapshot = await getDocs(collection(db, "questions"));
      let docIdToUpdate = "";
      querySnapshot.forEach((doc) => {
        if (doc.data().questionId === q.questionId) {
          docIdToUpdate = doc.id;
        }
      });

      if (docIdToUpdate) {
        await updateDoc(doc(db, "questions", docIdToUpdate), {
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedBy: "adityaagarwal113@gmail.com",
        });
        setUploadStatus({ type: "success", message: "Question successfully approved and committed to student application." });
        onRefreshDatabase();
      }
    } catch (e: any) {
      setUploadStatus({ type: "error", message: `Failed to approve: ${e.message}` });
    }
  };

  const handleReject = async (q: Question) => {
    try {
      const querySnapshot = await getDocs(collection(db, "questions"));
      let docIdToDelete = "";
      querySnapshot.forEach((doc) => {
        if (doc.data().questionId === q.questionId) {
          docIdToDelete = doc.id;
        }
      });

      if (docIdToDelete) {
        await deleteDoc(doc(db, "questions", docIdToDelete));
        setUploadStatus({ type: "success", message: "Question rejected and purged from review queue successfully." });
        onRefreshDatabase();
      }
    } catch (e: any) {
      setUploadStatus({ type: "error", message: `Failed to purge: ${e.message}` });
    }
  };

  // Update questions after editing
  const handleUpdateAndApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    try {
      const querySnapshot = await getDocs(collection(db, "questions"));
      let docIdToUpdate = "";
      querySnapshot.forEach((doc) => {
        if (doc.data().questionId === editingQuestion.questionId) {
          docIdToUpdate = doc.id;
        }
      });

      if (docIdToUpdate) {
        await updateDoc(doc(db, "questions", docIdToUpdate), {
          ...editingQuestion,
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedBy: "adityaagarwal113@gmail.com"
        });
        setEditingQuestion(null);
        setUploadStatus({ type: "success", message: "Edited question approved and merged successfully!" });
        onRefreshDatabase();
      }
    } catch (err: any) {
      setUploadStatus({ type: "error", message: `Failed to update question: ${err.message}` });
    }
  };

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto text-slate-200" id="admin-panel-root">
      
      {/* Title banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#090f1d] rounded-3xl p-6 text-white mb-8 border border-slate-850 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/40 text-amber-400">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">ActuaryVault Admin Console</h2>
            <p className="text-slate-400 text-xs mt-0.5">Admin Role Active. Manage syllabi, approve AI Extractions, and inspect telemetry stats.</p>
          </div>
        </div>
        
        {/* Rapid summary widgets */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Review Queue</span>
            <strong className="text-amber-400 text-base font-black">{pendingCount}</strong>
          </div>
          <div className="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Approved</span>
            <strong className="text-emerald-400 text-base font-black">{approvedCount}</strong>
          </div>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="flex border-b border-slate-800/80 mb-6 overflow-x-auto text-xs sm:text-sm font-semibold">
        <button
          onClick={() => { setActiveTab("upload"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "upload" ? "border-sky-500 text-sky-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Upload className="h-4 w-4" /> Upload Ingestion
        </button>
        <button
          onClick={() => { setActiveTab("review"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 relative cursor-pointer ${
            activeTab === "review" ? "border-sky-500 text-sky-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="h-4 w-4" /> Review Queue
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-slate-950 font-mono text-[9px] px-1.5 py-0.5 rounded-full absolute -top-1 -right-1 font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("manager"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "manager" ? "border-sky-500 text-sky-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-4 w-4" /> Question Bank Manager
        </button>
        <button
          onClick={() => { setActiveTab("analytics"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "analytics" ? "border-sky-500 text-sky-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Analytics Dashboard
        </button>
        <button
          onClick={() => { setActiveTab("users"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "users" ? "border-sky-500 text-sky-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="h-4 w-4" /> User Base
        </button>
        <button
          onClick={() => { setActiveTab("syllabus"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "syllabus" ? "border-sky-500 text-sky-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="h-4 w-4" /> Syllabus Manager
        </button>
      </div>

      {/* Global notifications component */}
      {uploadStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 mb-6 text-xs ${
          uploadStatus.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" 
            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
        }`}>
          {uploadStatus.type === "success" ? <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />}
          <p className="font-semibold leading-relaxed">{uploadStatus.message}</p>
        </div>
      )}

      {/* ======================= TAB A: UPLOAD CONTENT PIPELINE ======================= */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-6">
            {/* INGESTION FORM */}
            <div className="bg-[#090f1d] rounded-2xl border border-slate-800 p-5 shadow-sm space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Ingestion Form</span>
              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-mono">
                
                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1.5">Exam Body</label>
                  <div className="flex gap-2">
                    {["IFOA", "IAI"].map((body) => (
                      <button
                        key={body}
                        type="button"
                        onClick={() => setExamBody(body as ExamBodyType)}
                        className={`w-1/2 py-2 border rounded-xl font-bold transition text-center cursor-pointer ${
                          examBody === body 
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-sm shadow-sky-500/5" 
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        {body}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1.5">Actuarial Subject Code</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs font-medium text-slate-200"
                  >
                    {subjectsList.map((sub) => (
                      <option key={sub.code} value={sub.code}>{sub.code}: {sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1.5">Safe Rephrase System</label>
                  <div className="space-y-1.5">
                    {[
                      { id: "Original Only", label: "Original Only", desc: "Keep standard exact source prompt" },
                      { id: "Safe Rephrase", label: "Safe Rephrase", desc: "Modify filler surrounding text only" },
                      { id: "Original + Rephrase", label: "Original + Rephrase", desc: "Dual representation for student choice" }
                    ].map((mode) => (
                      <label key={mode.id} className="flex items-start gap-2.5 p-2 bg-slate-950/50 border border-slate-850 rounded-xl cursor-pointer select-none hover:bg-slate-900 transition">
                        <input
                          type="radio"
                          name="rephraseMode"
                          checked={rephraseMode === mode.id}
                          onChange={() => setRephraseMode(mode.id as any)}
                          className="mt-0.5 text-sky-500 focus:ring-0 h-3.5 w-3.5"
                        />
                        <div>
                          <strong className="text-[11px] text-slate-200 font-bold block">{mode.label}</strong>
                          <span className="text-[9px] text-slate-450 block -mt-0.5">{mode.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1">Exam Term ID</label>
                  <input 
                    type="text"
                    value={termText}
                    onChange={(e) => setTermText(e.target.value)}
                    placeholder="e.g. Apr 2025"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1.5">Source Material File</label>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-5 hover:bg-slate-900/40 hover:border-sky-500/50 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <Upload className="h-6 w-6 text-slate-500 mb-2" />
                    <span className="font-semibold text-slate-300 text-center">
                      {uploadedFile ? uploadedFile.name : "Choose PDF, image, txt"}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-1 uppercase">Max 50MB per file</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={processing || !uploadedFile}
                  className="w-full py-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold transition border border-sky-400/20 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/10"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                      <span>Gemini-AI Extraction Active...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-slate-950 animate-pulse" />
                      <span>Submit & Run AI Pipeline</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* DIRECT PAST PAPER PDF LINKER CARD */}
            <div className="bg-[#090f1d] rounded-2xl border border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sky-400">
                <Link2 className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-semibold uppercase tracking-wider block">Past Paper PDF Linker</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Upload a past paper question PDF directly, or link an external PDF URL, so students can open it with one click.
              </p>

              {linkingStatus && (
                <div className={`p-3 rounded-xl border text-[11px] font-semibold leading-relaxed ${
                  linkingStatus.type === "success" 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" 
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}>
                  {linkingStatus.message}
                </div>
              )}

              <form onSubmit={handleLinkPdfSubmit} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1">Exam Body</label>
                  <div className="flex gap-2">
                    {["IFOA", "IAI"].map((body) => (
                      <button
                        key={body}
                        type="button"
                        onClick={() => setPaperBody(body as ExamBodyType)}
                        className={`w-1/2 py-2 border rounded-xl font-bold transition text-center cursor-pointer ${
                          paperBody === body 
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/30" 
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        {body}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1">Actuarial Subject Code</label>
                  <select
                    value={paperSubject}
                    onChange={(e) => setPaperSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs font-medium text-slate-200"
                  >
                    {subjectsList.map((sub) => (
                      <option key={sub.code} value={sub.code}>{sub.code}: {sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1">Paper Term (e.g., Apr 2025)</label>
                  <input
                    type="text"
                    value={paperTerm}
                    onChange={(e) => setPaperTerm(e.target.value)}
                    placeholder="e.g. Apr 2025"
                    className="w-full p-2.5 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs text-slate-200"
                  />
                </div>

                <div className="border-t border-slate-800/85 pt-3">
                  <span className="block text-slate-400 font-bold uppercase mb-2">Option A: Upload PDF Document</span>
                  <div className="border border-dashed border-slate-800 rounded-xl bg-slate-950/40 p-4 hover:bg-slate-950/60 transition relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="h-5 w-5 text-slate-500 mb-1" />
                      <span className="font-semibold text-slate-300 text-center text-[10px] break-all">
                        {pdfFile ? pdfFile.name : "Select past paper PDF"}
                      </span>
                      <p className="text-[8px] text-slate-500 mt-0.5">Supports PDF up to 50MB (Bypasses Firestore limits)</p>
                    </div>
                  </div>
                </div>

                <div className="text-center text-slate-500 text-[10px] font-bold uppercase py-1">
                  — OR —
                </div>

                <div>
                  <span className="block text-slate-400 font-bold uppercase mb-1">Option B: Enter External PDF URL</span>
                  <input
                    type="url"
                    value={pdfUrlInput}
                    onChange={(e) => {
                      setPdfUrlInput(e.target.value);
                      if (e.target.value.trim()) setPdfFile(null);
                    }}
                    placeholder="https://example.com/paper.pdf"
                    className="w-full p-2.5 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={linkingPdf}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/5 cursor-pointer"
                >
                  {linkingPdf ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Linking Paper PDF...</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" />
                      <span>Link Past Paper PDF</span>
                    </>
                  )}
                </button>
              </form>

              {/* LIST OF CURRENTLY LINKED PAST PAPERS */}
              {pastPapers && pastPapers.length > 0 && (
                <div className="border-t border-slate-800/80 pt-3 mt-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Linked PDFs List</span>
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 font-sans">
                    {pastPapers.map((paper) => (
                      <div key={paper.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800 text-[10px]">
                        <div className="truncate pr-2">
                          <span className="font-bold text-sky-400 font-mono">{paper.examBody} {paper.subject}</span>
                          <span className="text-slate-400 ml-1.5">{paper.term}</span>
                        </div>
                        <button
                          onClick={() => handleDeletePaperPdf(paper.id)}
                          className="p-1 hover:bg-rose-500/10 rounded-md text-slate-500 hover:text-rose-400 transition cursor-pointer"
                          title="Delete PDF link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Extraction Stream Outputs</span>
            
            {processing && (
              <div className="text-center py-20 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-4">
                <div className="inline-block relative">
                  <RefreshCw className="h-10 w-10 text-sky-500 animate-spin" />
                  <Sparkles className="h-4 w-4 text-indigo-400 absolute bottom-0 right-0 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-slate-200">Uploading to Gemini Deep Parser...</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Retrieving OCR layers, executing safe rephrase rewrites, calculating actuarial solutions, and grading confidence levels automatically.
                  </p>
                </div>
              </div>
            )}

            {!processing && extractedPreview.length === 0 && (
              <div className="text-center py-20 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs">
                Run the left AI extraction pipeline to preview generated questions in this screen.
              </div>
            )}

            {!processing && extractedPreview.length > 0 && (
              <div className="space-y-4">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Check className="h-4.5 w-4.5" /> Pipeline Extracted Questions ({extractedPreview.length})
                </span>

                <div className="space-y-4">
                  {extractedPreview.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/30">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-xs">
                        <span className="font-bold font-mono text-slate-300">QUESTION {idx + 1} ({q.marks} Marks)</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold border ${
                            q.confidenceScore && q.confidenceScore > 90 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            Confidence: {q.confidenceScore || 95}%
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            q.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {q.status === "approved" ? "Auto-Approved" : "Queued Review"}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-slate-200 whitespace-pre-line leading-relaxed">{q.question}</p>
                      
                      {q.aiSolution && (
                        <details className="mt-3 text-xs border-t border-slate-800 pt-2 text-slate-400">
                          <summary className="cursor-pointer font-bold select-none hover:text-sky-400">View Generated AI Solution</summary>
                          <p className="mt-2 text-slate-300 whitespace-pre-line bg-slate-950 p-3 border border-slate-850 rounded-lg">{q.aiSolution}</p>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB B: REVIEW QUEUE (PENDING ACTIONS) ======================= */}
      {activeTab === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Pending Queue ({questions.filter(q => q.status === "pending").length} items)</span>
            
            {questions.filter(q => q.status === "pending").length === 0 ? (
              <div className="text-center py-20 bg-slate-950/40 rounded-2xl text-xs text-slate-500 border border-slate-850">
                All uploaded questions are currently approved and live!
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {questions
                  .filter(q => q.status === "pending")
                  .map((q) => (
                    <button
                      key={q.questionId}
                      onClick={() => {
                        setEditingQuestion(q);
                        setUploadStatus(null);
                      }}
                      className={`w-full text-left p-4 rounded-xl border text-xs transition cursor-pointer ${
                        editingQuestion?.questionId === q.questionId
                          ? "border-amber-500 bg-amber-500/10 text-slate-200"
                          : "border-slate-800/80 hover:border-slate-700 bg-slate-950/30 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-450 mb-1.5 font-mono">
                        <span className="font-bold">{q.examBody} / Subject {q.subject}</span>
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Percent className="h-2.5 w-2.5" /> Ratio {q.confidenceScore || 85}%
                        </span>
                      </div>
                      <p className="font-semibold text-slate-200 line-clamp-3 leading-relaxed">{q.question}</p>
                      
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-3 pt-2 border-t border-slate-800/60">
                        <span>Chapter: {q.chapter}</span>
                        <span>Marks: {q.marks}</span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-4">
            {!editingQuestion ? (
              <div className="bg-slate-950/40 border border-slate-800 text-slate-500 text-xs text-center py-20 rounded-2xl">
                Select a pending question from the left queue to perform edits, approve, or reject.
              </div>
            ) : (
              <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-sm text-slate-200">
                
                {/* Header detail */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Inspecting Queue Item: {editingQuestion.questionId}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(editingQuestion)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve Live
                    </button>
                    <button
                      onClick={() => handleReject(editingQuestion)}
                      className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>

                {/* Inline form edits */}
                <form onSubmit={handleUpdateAndApprove} className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Subject Unit</label>
                      <input 
                        type="text" 
                        value={editingQuestion.subject} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, subject: e.target.value })} 
                        className="w-full p-2 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Chapter Name</label>
                      <input 
                        type="text" 
                        value={editingQuestion.chapter} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, chapter: e.target.value })} 
                        className="w-full p-2 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Topic Name</label>
                      <input 
                        type="text" 
                        value={editingQuestion.topic} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, topic: e.target.value })} 
                        className="w-full p-2 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Difficulty</label>
                      <select
                        value={editingQuestion.difficulty}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as DifficultyType })}
                        className="w-full p-2 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Marks Value</label>
                      <input 
                        type="number" 
                        value={editingQuestion.marks} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: parseInt(e.target.value) || 0 })} 
                        className="w-full p-2 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Command Word</label>
                      <input 
                        type="text" 
                        value={editingQuestion.commandWord} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, commandWord: e.target.value })} 
                        className="w-full p-2 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Original Question Text</label>
                    <textarea
                      rows={4}
                      value={editingQuestion.question}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                      className="w-full p-3 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {editingQuestion.rephrasedQuestion !== undefined && (
                    <div>
                      <label className="block text-slate-400 mb-1">Safe Rephrased Question Text</label>
                      <textarea
                        rows={4}
                        value={editingQuestion.rephrasedQuestion}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, rephrasedQuestion: e.target.value })}
                        className="w-full p-3 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 mb-1">Detailed AI Solution Explanation</label>
                    <textarea
                      rows={4}
                      value={editingQuestion.aiSolution}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, aiSolution: e.target.value })}
                      className="w-full p-3 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-sky-400/20"
                    >
                      <Save className="h-4 w-4" /> Save Edits & Approve Item
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB C: QUESTION BANK MANAGER ======================= */}
      {activeTab === "manager" && (
        <div className="bg-[#090f1d] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6 text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-sky-400" /> Live Question Bank Repository
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Filter, inspect, audit, or delete active items in the current compilation database.</p>
            </div>
            <span className="text-xs px-3 py-1 bg-sky-500/10 border border-sky-400/20 text-sky-400 rounded-lg font-mono font-bold">
              {questions.filter(q => q.status === "approved").length} Approved Active
            </span>
          </div>

          {/* DYNAMIC FLOW SELECTORS */}
          <div className="space-y-4 bg-slate-950/40 p-5 rounded-xl border border-slate-800/60">
            {/* 1st Choice: Subject Choice */}
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2.5 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-sky-500/15 text-sky-400 text-[10px] flex items-center justify-center font-sans font-extrabold">1</span>
                Select Subject Code First
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[...subjectsList.map(s => s.code), "All"].map((sub) => {
                  const count = questions.filter(
                    q => q.status === "approved" && (
                      sub === "All" || 
                      (sub === "SP" && q.subject.startsWith("SP")) ||
                      (sub === "SA" && q.subject.startsWith("SA")) ||
                      q.subject === sub
                    )
                  ).length;
                  const isActive = managerSubject === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setManagerSubject(sub)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        isActive
                          ? "bg-gradient-to-tr from-sky-400 to-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/10"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white"
                      }`}
                    >
                      <span>{sub}</span>
                      <span className={`text-[10px] px-1 py-0.2 rounded font-black font-mono ${
                        isActive ? "bg-slate-950/20 text-slate-950" : "bg-slate-950 text-slate-400"
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2nd Choice: Institute Choice */}
            <div className="pt-3 border-t border-slate-800/60">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2.5 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-sky-500/15 text-sky-400 text-[10px] flex items-center justify-center font-sans font-extrabold">2</span>
                Then Select Examining Institute
              </span>
              <div className="flex gap-2">
                {["IFOA", "IAI", "All"].map((body) => {
                  const count = questions.filter(
                    q => q.status === "approved" && 
                    (managerSubject === "All" || q.subject === managerSubject || (managerSubject === "SP" && q.subject.startsWith("SP")) || (managerSubject === "SA" && q.subject.startsWith("SA"))) &&
                    (body === "All" || q.examBody === body)
                  ).length;
                  const isActive = managerInstitute === body;
                  return (
                    <button
                      key={body}
                      type="button"
                      onClick={() => setManagerInstitute(body)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                        isActive
                          ? "bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/15"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white"
                      }`}
                    >
                      <span>{body === "All" ? "All Institutes" : body === "IFOA" ? "IFOA (UK Syllabus)" : "IAI (India Syllabus)"}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-black font-mono ${
                        isActive ? "bg-slate-950/25 text-white" : "bg-slate-950 text-slate-400"
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RENDER DYNAMIC COMPACT HIGH-FIDELITY TABLE MATCHING WHITEBOARD/IMAGE ATTACHED */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#030712]/60 shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-300 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <th className="p-4 min-w-[280px]">Question (Copyright proof)</th>
                  <th className="p-4 min-w-[160px]">MCQ Options</th>
                  <th className="p-4 min-w-[300px]">Model Solution</th>
                  <th className="p-4 min-w-[80px] text-center">Marks</th>
                  <th className="p-4 min-w-[180px]">Chapter/ Topic</th>
                  <th className="p-4 min-w-[100px] text-center">Institute</th>
                  <th className="p-4 min-w-[70px] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/65">
                {(() => {
                  const filteredApproved = questions
                    .filter(q => q.status === "approved")
                    .filter(q => {
                      if (managerSubject === "All") return true;
                      if (managerSubject === "SP") return q.subject.startsWith("SP");
                      if (managerSubject === "SA") return q.subject.startsWith("SA");
                      return q.subject === managerSubject;
                    })
                    .filter(q => {
                      if (managerInstitute === "All") return true;
                      return q.examBody === managerInstitute;
                    });

                  if (filteredApproved.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-slate-500 font-mono">
                          No active questions match filters. Try changing filters or uploading additional papers.
                        </td>
                      </tr>
                    );
                  }

                  return filteredApproved.map((q) => (
                    <tr key={q.questionId} className="hover:bg-slate-900/40 transition">
                      
                      {/* 1. Question text */}
                      <td className="p-4 align-top">
                        <div className="space-y-1">
                          <p className="text-slate-100 font-sans font-medium whitespace-pre-line leading-relaxed max-h-[140px] overflow-y-auto pr-1">
                            {q.rephrasedQuestion || q.question}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            {q.rephrasedQuestion ? (
                              <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-400/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                ✨ Copyright Proof Rephrased
                              </span>
                            ) : (
                              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded font-mono font-semibold uppercase">
                                Original Copy
                              </span>
                            )}
                            <span className="text-[9px] text-slate-500 font-mono">ID: {q.questionId}</span>
                          </div>
                        </div>
                      </td>

                      {/* 2. MCQ Options */}
                      <td className="p-4 align-top">
                        <div className="space-y-1 font-mono text-[10.5px]">
                          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-1.5">
                            <div className="text-slate-300"><span className="text-sky-400 font-bold">A)</span> Calculate/derive exact value</div>
                            <div className="text-slate-400"><span className="text-slate-500 font-bold">B)</span> Explain theoretical limitations</div>
                            <div className="text-slate-400"><span className="text-slate-500 font-bold">C)</span> State general Solvency standard</div>
                            <div className="text-slate-400"><span className="text-slate-500 font-bold">D)</span> Discuss high-friction constraints</div>
                          </div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Simulated MCQ matrix</span>
                        </div>
                      </td>

                      {/* 3. Model Solution */}
                      <td className="p-4 align-top">
                        <div className="space-y-1.5">
                          <details className="group">
                            <summary className="text-[11px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer select-none outline-none flex items-center gap-1">
                              <span>Expand Solution Rubric</span>
                              <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                            </summary>
                            <div className="mt-2 text-[11px] text-slate-300 whitespace-pre-line bg-slate-950/80 p-3 border border-slate-800/80 rounded-lg max-h-[160px] overflow-y-auto pr-1 leading-relaxed font-mono">
                              {q.aiSolution || q.officialAnswer || "Standard numerical verification schemes apply."}
                            </div>
                          </details>
                          <div className="text-[9.5px] text-slate-500 font-mono truncate max-w-[280px]">
                            {q.markScheme || "Full marks allocated upon correct application of principles."}
                          </div>
                        </div>
                      </td>

                      {/* 4. Marks */}
                      <td className="p-4 align-top text-center">
                        <span className="inline-block px-2.5 py-1 bg-sky-500/10 border border-sky-400/20 text-sky-400 font-mono font-bold rounded-lg text-xs">
                          {q.marks} M
                        </span>
                      </td>

                      {/* 5. Chapter / Topic */}
                      <td className="p-4 align-top">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-200 block text-[11px] leading-snug">{q.chapter}</span>
                          <span className="text-slate-400 block text-[10px]">{q.topic || "Core Principles"}</span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-300 border border-slate-700/60 rounded font-mono">
                            {q.subject}
                          </span>
                        </div>
                      </td>

                      {/* 6. Institute */}
                      <td className="p-4 align-top text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                          q.examBody === "IFOA"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                          {q.examBody}
                        </span>
                      </td>

                      {/* 7. Action */}
                      <td className="p-4 align-top text-center">
                        <button
                          onClick={() => handleReject(q)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg transition cursor-pointer"
                          title="Purge/Delete question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>

                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================= TAB D: ANALYTICS DASHBOARD ======================= */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Bento grid stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-200">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">Total Active Questions</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-black text-white">{approvedCount}</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold block">100% Core</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">Live questions available inside Student matrix.</p>
            </div>

            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-200">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">Average Marks Weight</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-black text-white">
                  {questions.length > 0 
                    ? (questions.reduce((sum, q) => sum + q.marks, 0) / questions.length).toFixed(1) 
                    : "0.0"}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block">Marks</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">Perfect for high mark weighting tests.</p>
            </div>

            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-200">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">Average AI Confidence</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-black text-white">
                  {questions.length > 0 
                    ? (questions.reduce((sum, q) => sum + (q.confidenceScore || 95), 0) / questions.length).toFixed(0) 
                    : "0"}%
                </span>
                <span className="text-[10px] font-mono text-sky-400 font-bold block">Excellent</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">Average precision of the extraction models parsing PDFs.</p>
            </div>

            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-200">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">IFOA / IAI Distribution</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-display font-black text-white">
                  {questions.filter(q => q.examBody === "IFOA").length} IFOA / {questions.filter(q => q.examBody === "IAI").length} IAI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">Synergy distribution of paper sets.</p>
            </div>
          </div>

          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-200">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Core Subject Partition Distribution</span>
            
            <div className="space-y-3 font-mono text-xs">
              {subjectsList.map(s => s.code).map((sub) => {
                const count = questions.filter(
                  q => q.subject === sub || (sub === "SP" && q.subject.startsWith("SP")) || (sub === "SA" && q.subject.startsWith("SA"))
                ).length;
                const percent = questions.length > 0 ? (count / questions.length) * 100 : 0;

                return (
                  <div key={sub} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Subject {sub} Series</span>
                      <span>{count} unit ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2">
                      <div className="bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full h-2 transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB E: USER BASE ======================= */}
      {activeTab === "users" && (
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-slate-200">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-3">Active Test Candidates Telemetry</span>
          
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 border border-slate-800 bg-slate-950/40 rounded-xl flex items-center justify-between">
              <div>
                <strong className="text-slate-200 font-bold block">adityaagarwal113@gmail.com</strong>
                <span className="text-slate-400 text-[10px] block">Role: Administrator</span>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-1 rounded text-[10px] uppercase">ACTIVE</span>
            </div>

            <div className="p-4 border border-slate-800 bg-slate-950/40 rounded-xl flex items-center justify-between opacity-85">
              <div>
                <strong className="text-slate-300 font-bold block">candidate.test@actuaryvault.com</strong>
                <span className="text-slate-400 text-[10px] block">Role: Student</span>
              </div>
              <span className="bg-slate-900 text-slate-500 border border-slate-800 px-2 py-1 rounded text-[10px] uppercase">OFFLINE</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB F: SYLLABUS & CHAPTERS MANAGER ======================= */}
      {activeTab === "syllabus" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANEL: SUBJECTS LIST */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-sky-400" /> Dynamic Actuarial Syllabi
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">List of active exam codes and chapters pool.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewSubjectForm(!showNewSubjectForm)}
                  className="px-2.5 py-1.5 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500 text-sky-400 hover:text-slate-950 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> Add Subject
                </button>
              </div>

              {loadingSyllabus ? (
                <div className="text-center py-10 font-mono text-xs text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-sky-400" />
                  Loading database configurations...
                </div>
              ) : (
                <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                  {subjectsList.map((sub) => {
                    const chCount = chaptersMap[sub.code]?.length || 0;
                    const isSelected = selectedSyllabusSubject === sub.code && !showNewSubjectForm;
                    return (
                      <div
                        key={sub.code}
                        onClick={() => {
                          setSelectedSyllabusSubject(sub.code);
                          setShowNewSubjectForm(false);
                        }}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                          isSelected 
                            ? "bg-sky-500/10 border-sky-500/30 text-slate-100" 
                            : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-mono font-bold tracking-wider text-sky-400">{sub.code}</strong>
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 font-mono text-slate-400 font-black">
                            {chCount} chapters
                          </span>
                        </div>
                        <span className="block text-xs font-bold text-slate-200 mt-1">{sub.name}</span>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-1 line-clamp-2">{sub.desc}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: EDITOR */}
          <div className="lg:col-span-7">
            {showNewSubjectForm ? (
              /* NEW SUBJECT CONFIGURATION FORM */
              <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> Add Custom Actuarial Subject
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Create a brand-new code and define its chapter structure.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewSubjectForm(false)}
                    className="text-slate-400 hover:text-slate-200 text-xs font-bold font-mono"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleCreateNewSubject} className="space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1.5">Subject Code (e.g. SP5, SA4)</label>
                      <input
                        type="text"
                        required
                        value={newSubjectCode}
                        onChange={(e) => setNewSubjectCode(e.target.value)}
                        placeholder="e.g. SP5"
                        className="w-full p-2.5 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs text-slate-200 font-bold tracking-wider uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1.5">Subject Title</label>
                      <input
                        type="text"
                        required
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="e.g. Investment Principles"
                        className="w-full p-2.5 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1.5">Description / Learning Objectives</label>
                    <textarea
                      rows={2}
                      value={newSubjectDesc}
                      onChange={(e) => setNewSubjectDesc(e.target.value)}
                      placeholder="e.g. Actuarial modeling, risk parameters, portfolio evaluation guidelines..."
                      className="w-full p-2.5 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs text-slate-200 resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-bold text-slate-400 uppercase">Syllabus Chapters (One per line)</label>
                      <span className="text-[9px] text-sky-400">Newline-separated</span>
                    </div>
                    <textarea
                      rows={8}
                      required
                      value={newSubjectChapters}
                      onChange={(e) => setNewSubjectChapters(e.target.value)}
                      placeholder="Actuarial Modelling & Cash Flow&#10;Time Value of Money & Interest Rates&#10;Real & Money Interest Rates"
                      className="w-full p-3 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs text-slate-200 font-sans leading-relaxed"
                    />
                    <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                      You can paste your list of chapters directly above. Empty lines are ignored automatically.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full py-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-center cursor-pointer shadow-md transition disabled:opacity-50"
                    >
                      {processing ? "Creating Subject..." : "Create Subject Configuration"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* EDITING SELECTED SUBJECT */
              <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <Edit2 className="h-4 w-4 text-sky-400" /> Edit Subject Configuration: <span className="font-mono text-sky-400">{selectedSyllabusSubject}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Customize metadata and update the chapters pool mapping.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSyllabusSubject(selectedSyllabusSubject)}
                    className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-slate-950 text-rose-400 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Delete Subject
                  </button>
                </div>

                <form onSubmit={handleSaveSyllabus} className="space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1.5">Subject Code (Read Only)</label>
                      <input
                        type="text"
                        disabled
                        value={selectedSyllabusSubject}
                        className="w-full p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl text-xs text-slate-400 font-bold tracking-wider uppercase cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1.5">Subject Title</label>
                      <input
                        type="text"
                        required
                        value={syllabusNameInput}
                        onChange={(e) => setSyllabusNameInput(e.target.value)}
                        placeholder="e.g. Actuarial Mathematics"
                        className="w-full p-2.5 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1.5">Description / Learning Objectives</label>
                    <textarea
                      rows={2}
                      value={syllabusDescInput}
                      onChange={(e) => setSyllabusDescInput(e.target.value)}
                      placeholder="e.g. Interest theory, survival models, and contingencies."
                      className="w-full p-2.5 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs text-slate-200 resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <label className="block font-bold text-slate-400 uppercase">Syllabus Chapters</label>
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setEditorMode("visual")}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                            editorMode === "visual"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/25"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Visual List Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorMode("raw")}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                            editorMode === "raw"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/25"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Raw Text Editor
                        </button>
                      </div>
                    </div>

                    {editorMode === "raw" ? (
                      <div className="space-y-2">
                        <textarea
                          rows={10}
                          required
                          value={syllabusChaptersInput}
                          onChange={(e) => handleRawChaptersChange(e.target.value)}
                          placeholder="Enter chapters list..."
                          className="w-full p-3 bg-slate-950/80 border border-slate-850 rounded-xl focus:outline-none focus:border-sky-500 text-xs text-slate-200 font-sans leading-relaxed"
                        />
                        <p className="text-[9px] text-slate-400 leading-relaxed">
                          Edit, add, or replace chapters directly in the raw textarea. Cleaned values are automatically synced with the visual list view.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-slate-950/30 p-3 rounded-xl border border-slate-850">
                        
                        {/* Add chapter input visual row */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type a new chapter name..."
                            value={newChapterInput}
                            onChange={(e) => setNewChapterInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddChapterVisual();
                              }
                            }}
                            className="flex-1 p-2 bg-slate-950/90 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-sans"
                          />
                          <button
                            type="button"
                            onClick={handleAddChapterVisual}
                            className="px-3 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Chapter
                          </button>
                        </div>

                        {/* Visual chapters list */}
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                          {syllabusChaptersArray.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-[11px]">
                              No chapters defined. Type above to add your first chapter!
                            </div>
                          ) : (
                            syllabusChaptersArray.map((chap, idx) => {
                              const isEditing = editingChapterIndex === idx;
                              return (
                                <div
                                  key={`${chap}-${idx}`}
                                  className="flex items-center justify-between p-2.5 bg-slate-950/50 hover:bg-slate-950/80 border border-slate-850/60 rounded-xl gap-2 transition"
                                >
                                  {isEditing ? (
                                    <div className="flex-1 flex gap-1.5 items-center">
                                      <input
                                        type="text"
                                        value={editingChapterText}
                                        onChange={(e) => setEditingChapterText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSaveEditChapter(idx);
                                          } else if (e.key === 'Escape') {
                                            handleCancelEditChapter();
                                          }
                                        }}
                                        className="flex-1 p-1 bg-slate-950 border border-sky-500 rounded text-xs text-slate-200 font-sans"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditChapter(idx)}
                                        className="p-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-md hover:bg-emerald-500 hover:text-slate-950 transition cursor-pointer"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEditChapter}
                                        className="p-1.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-md hover:bg-rose-500 hover:text-slate-950 transition cursor-pointer"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-xs text-slate-200 font-sans flex-1 truncate pr-2">
                                        <span className="text-[10px] font-mono text-slate-500 font-bold mr-1.5">{idx + 1}.</span>
                                        {chap}
                                      </span>
                                      
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {/* Reordering */}
                                        <button
                                          type="button"
                                          disabled={idx === 0}
                                          onClick={() => handleMoveChapterUpVisual(idx)}
                                          className="p-1 text-slate-400 hover:text-sky-400 disabled:opacity-20 transition cursor-pointer"
                                          title="Move Up"
                                        >
                                          <ArrowUp className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={idx === syllabusChaptersArray.length - 1}
                                          onClick={() => handleMoveChapterDownVisual(idx)}
                                          className="p-1 text-slate-400 hover:text-sky-400 disabled:opacity-20 transition cursor-pointer"
                                          title="Move Down"
                                        >
                                          <ArrowDown className="h-3 w-3" />
                                        </button>
                                        
                                        {/* Inline edit */}
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditChapter(idx, chap)}
                                          className="p-1 text-slate-400 hover:text-amber-400 transition ml-1 cursor-pointer"
                                          title="Rename Chapter"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </button>

                                        {/* Delete */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteChapterVisual(idx)}
                                          className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                          title="Delete Chapter"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full py-2.5 bg-gradient-to-tr from-sky-400 to-sky-500 hover:from-sky-350 hover:to-sky-450 text-slate-950 font-bold rounded-xl text-center cursor-pointer shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Save className="h-4 w-4" /> {processing ? "Saving Syllabus..." : "Save Subject Configuration"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
