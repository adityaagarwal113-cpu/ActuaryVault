import React, { useState, useEffect } from "react";
import { Question, ExamBodyType, SubjectType, DifficultyType } from "../types";
import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { 
  Upload, CheckCircle, AlertTriangle, Trash2, Edit2, Check, X, 
  Layers, Award, BarChart3, Users, Clock, Percent, Shield, Sparkles, Save, RefreshCw
} from "lucide-react";

interface AdminPanelProps {
  questions: Question[];
  onRefreshDatabase: () => void;
}

export default function AdminPanel({ questions, onRefreshDatabase }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "review" | "manager" | "analytics" | "users">("upload");
  
  // Data State
  const [examBody, setExamBody] = useState<ExamBodyType>("IFOA");
  const [subject, setSubject] = useState<string>("SP");
  const [rephraseMode, setRephraseMode] = useState<"Original Only" | "Safe Rephrase" | "Original + Rephrase">("Safe Rephrase");
  const [termText, setTermText] = useState<string>("Apr 2025");

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
    <div className="py-6 px-4 max-w-7xl mx-auto text-slate-800" id="admin-panel-root">
      
      {/* Title banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 text-white mb-8 border border-slate-700 shadow-lg flex flex-wrap items-center justify-between gap-4">
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
          <div className="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Review Queue</span>
            <strong className="text-amber-400 text-base font-black">{pendingCount}</strong>
          </div>
          <div className="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Approved</span>
            <strong className="text-emerald-400 text-base font-black">{approvedCount}</strong>
          </div>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto text-xs sm:text-sm font-semibold">
        <button
          onClick={() => { setActiveTab("upload"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "upload" ? "border-slate-900 text-slate-950 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Upload className="h-4 w-4" /> Upload Ingestion
        </button>
        <button
          onClick={() => { setActiveTab("review"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 relative ${
            activeTab === "review" ? "border-slate-900 text-slate-950 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Clock className="h-4 w-4" /> Review Queue
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full absolute -top-1 -right-1 font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("manager"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "manager" ? "border-slate-900 text-slate-950 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Layers className="h-4 w-4" /> Question Bank Manager
        </button>
        <button
          onClick={() => { setActiveTab("analytics"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "analytics" ? "border-slate-900 text-slate-950 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Analytics Dashboard
        </button>
        <button
          onClick={() => { setActiveTab("users"); setUploadStatus(null); }}
          className={`pb-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "users" ? "border-slate-900 text-slate-950 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Users className="h-4 w-4" /> User Base
        </button>
      </div>

      {/* Global notifications component */}
      {uploadStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 mb-6 text-xs text-slate-900 ${
          uploadStatus.type === "success" 
            ? "bg-emerald-50 border-emerald-200" 
            : "bg-rose-50 border-rose-200"
        }`}>
          {uploadStatus.type === "success" ? <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
          <p className="font-semibold leading-relaxed">{uploadStatus.message}</p>
        </div>
      )}

      {/* ======================= TAB A: UPLOAD CONTENT PIPELINE ======================= */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Ingestion Form</span>
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-mono">
              
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">Exam Body</label>
                <div className="flex gap-2">
                  {["IFOA", "IAI"].map((body) => (
                    <button
                      key={body}
                      type="button"
                      onClick={() => setExamBody(body as ExamBodyType)}
                      className={`w-1/2 py-2 border rounded-xl font-bold transition text-center cursor-pointer ${
                        examBody === body 
                          ? "bg-slate-950 text-white border-slate-950" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {body}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">Actuarial Subject Code</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-xs font-medium text-slate-800"
                >
                  <option value="CM1">CM1: Actuarial Mathematics</option>
                  <option value="CM2">CM2: Financial Engineering</option>
                  <option value="CS1">CS1: Actuarial Statistics</option>
                  <option value="CS2">CS2: Risk Modelling</option>
                  <option value="CB1">CB1: Business Finance</option>
                  <option value="CB2">CB2: Business Economics</option>
                  <option value="CP1">CP1: Actuarial Practice</option>
                  <option value="CP2">CP2: Modelling Practice</option>
                  <option value="CP3">CP3: Actuarial Communication</option>
                  <option value="SP5">SP5: Investment Principles</option>
                  <option value="SP2">SP2: Life Insurance Specialist</option>
                  <option value="SA2">SA2: Life Strategic Advanced</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">Safe Rephrase System</label>
                <div className="space-y-1.5">
                  {[
                    { id: "Original Only", label: "Original Only", desc: "Keep standard exact source prompt" },
                    { id: "Safe Rephrase", label: "Safe Rephrase", desc: "Modify filler surrounding text only" },
                    { id: "Original + Rephrase", label: "Original + Rephrase", desc: "Dual representation for student choice" }
                  ].map((mode) => (
                    <label key={mode.id} className="flex items-start gap-2.5 p-2 bg-slate-50 border border-slate-150 rounded-xl cursor-pointer select-none hover:bg-slate-100 transition">
                      <input
                        type="radio"
                        name="rephraseMode"
                        checked={rephraseMode === mode.id}
                        onChange={() => setRephraseMode(mode.id as any)}
                        className="mt-0.5 text-slate-950 focus:ring-0 h-3.5 w-3.5"
                      />
                      <div>
                        <strong className="text-[11px] text-slate-900 font-bold block">{mode.label}</strong>
                        <span className="text-[9px] text-slate-400 block -mt-0.5">{mode.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Exam Term ID</label>
                <input 
                  type="text"
                  value={termText}
                  onChange={(e) => setTermText(e.target.value)}
                  placeholder="e.g. Apr 2025"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">Source Material File</label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-5 hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <Upload className="h-6 w-6 text-slate-400 mb-2" />
                  <span className="font-semibold text-slate-700 text-center">
                    {uploadedFile ? uploadedFile.name : "Choose PDF, image, txt"}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase">Max 50MB per file</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing || !uploadedFile}
                className="w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 disabled:opacity-50 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-950/15"
              >
                {processing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
                    <span>Gemini-AI Extraction Active...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-sky-400 animate-pulse" />
                    <span>Submit & Run AI Pipeline</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Extraction Stream Outputs</span>
            
            {processing && (
              <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-4">
                <div className="inline-block relative">
                  <RefreshCw className="h-10 w-10 text-sky-500 animate-spin" />
                  <Sparkles className="h-4 w-4 text-indigo-600 absolute bottom-0 right-0 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-slate-900">Uploading to Gemini Deep Parser...</h4>
                  <p className="text-xs text-slate-450 mt-1 max-w-xs mx-auto">
                    Retrieving OCR layers, executing safe rephrase rewrites, calculating actuarial solutions, and grading confidence levels automatically.
                  </p>
                </div>
              </div>
            )}

            {!processing && extractedPreview.length === 0 && (
              <div className="text-center py-20 bg-slate-50/20 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                Run the left AI extraction pipeline to preview generated questions in this screen.
              </div>
            )}

            {!processing && extractedPreview.length > 0 && (
              <div className="space-y-4">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <Check className="h-4.5 w-4.5" /> Pipeline Extracted Questions ({extractedPreview.length})
                </span>

                <div className="space-y-4">
                  {extractedPreview.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-150 bg-slate-50/30">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3 text-xs">
                        <span className="font-bold font-mono">QUESTION {idx + 1} ({q.marks} Marks)</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.confidenceScore && q.confidenceScore > 90 
                              ? "bg-emerald-50 text-emerald-800" 
                              : "bg-amber-50 text-amber-800"
                          }`}>
                            Confidence: {q.confidenceScore || 95}%
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.status === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                          }`}>
                            {q.status === "approved" ? "Auto-Approved" : "Queued Review"}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 whitespace-pre-line leading-relaxed">{q.question}</p>
                      
                      {q.aiSolution && (
                        <details className="mt-3 text-xs border-t border-slate-100 pt-2 text-slate-600">
                          <summary className="cursor-pointer font-bold select-none hover:text-slate-900">View Generated AI Solution</summary>
                          <p className="mt-2 text-slate-500 whitespace-pre-line bg-white p-3 border border-slate-150 rounded-lg">{q.aiSolution}</p>
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
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Pending Queue ({questions.filter(q => q.status === "pending").length} items)</span>
            
            {questions.filter(q => q.status === "pending").length === 0 ? (
              <div className="text-center py-20 bg-slate-50/50 rounded-2xl text-xs text-slate-400">
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
                      className={`w-full text-left p-4 rounded-xl border text-xs transition ${
                        editingQuestion?.questionId === q.questionId
                          ? "border-amber-500 bg-amber-50/20"
                          : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-mono">
                        <span className="font-bold">{q.examBody} / Subject {q.subject}</span>
                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Percent className="h-2.5 w-2.5" /> Ratio {q.confidenceScore || 85}%
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 line-clamp-3 leading-relaxed">{q.question}</p>
                      
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-3 pt-2 border-t border-slate-100/60">
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
              <div className="bg-slate-50 border border-slate-200 text-slate-400 text-xs text-center py-20 rounded-2xl">
                Select a pending question from the left queue to perform edits, approve, or reject.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                
                {/* Header detail */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    Inspecting Queue Item: {editingQuestion.questionId}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(editingQuestion)}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve Live
                    </button>
                    <button
                      onClick={() => handleReject(editingQuestion)}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>

                {/* Inline form edits */}
                <form onSubmit={handleUpdateAndApprove} className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1">Subject Unit</label>
                      <input 
                        type="text" 
                        value={editingQuestion.subject} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, subject: e.target.value })} 
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Chapter Name</label>
                      <input 
                        type="text" 
                        value={editingQuestion.chapter} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, chapter: e.target.value })} 
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Topic Name</label>
                      <input 
                        type="text" 
                        value={editingQuestion.topic} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, topic: e.target.value })} 
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Difficulty</label>
                      <select
                        value={editingQuestion.difficulty}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as DifficultyType })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Marks Value</label>
                      <input 
                        type="number" 
                        value={editingQuestion.marks} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: parseInt(e.target.value) || 0 })} 
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Command Word</label>
                      <input 
                        type="text" 
                        value={editingQuestion.commandWord} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, commandWord: e.target.value })} 
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Original Question Text</label>
                    <textarea
                      rows={4}
                      value={editingQuestion.question}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  {editingQuestion.rephrasedQuestion !== undefined && (
                    <div>
                      <label className="block text-slate-505 mb-1">Safe Rephrased Question Text</label>
                      <textarea
                        rows={4}
                        value={editingQuestion.rephrasedQuestion}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, rephrasedQuestion: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-500 mb-1">Detailed AI Solution Explanation</label>
                    <textarea
                      rows={4}
                      value={editingQuestion.aiSolution}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, aiSolution: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer"
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
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Inspecting Live Question Bank ({questions.filter(q => q.status === "approved").length} active items)</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {questions.filter(q => q.status === "approved").length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">
                No active questions found in collection. Try clicking "Re-seed Initial Data" or uploading a paper!
              </div>
            ) : (
              questions
                .filter(q => q.status === "approved")
                .map((q) => (
                  <div key={q.questionId} className="p-4 border border-slate-100 rounded-xl flex items-start justify-between gap-4 text-xs font-mono">
                    <div className="space-y-1.5 flex-1 select-none">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                          {q.examBody} / {q.subject}
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                          Chapter: {q.chapter}
                        </span>
                        {q.term && (
                          <span className="bg-slate-100 text-sky-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {q.term} Series
                          </span>
                        )}
                        <span className="text-slate-400 text-[10px]">Marks: {q.marks}</span>
                      </div>
                      <p className="font-semibold text-slate-800 font-sans">{q.question}</p>
                    </div>

                    <button
                      onClick={() => handleReject(q)}
                      className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 hover:text-rose-700 transition"
                      title="Purge/Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB D: ANALYTICS DASHBOARD ======================= */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Bento grid stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">Total Active Questions</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-black text-slate-900">{approvedCount}</span>
                <span className="text-[10px] font-mono text-emerald-500 font-bold block">100% Core</span>
              </div>
              <p className="text-[10px] text-slate-450 mt-2 font-mono">Live questions available inside Student matrix.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">Average Marks Weight</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-black text-slate-900">
                  {questions.length > 0 
                    ? (questions.reduce((sum, q) => sum + q.marks, 0) / questions.length).toFixed(1) 
                    : "0.0"}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block">Marks</span>
              </div>
              <p className="text-[10px] text-slate-450 mt-2 font-mono">Perfect for high mark weighting tests.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">Average AI Confidence</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-black text-slate-900">
                  {questions.length > 0 
                    ? (questions.reduce((sum, q) => sum + (q.confidenceScore || 95), 0) / questions.length).toFixed(0) 
                    : "0"}%
                </span>
                <span className="text-[10px] font-mono text-sky-500 font-bold block">Excellent</span>
              </div>
              <p className="text-[10px] text-slate-450 mt-2 font-mono">Average precision of the extraction models parsing PDFs.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">IFOA / IAI Distribution</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-display font-black text-slate-900">
                  {questions.filter(q => q.examBody === "IFOA").length} IFOA / {questions.filter(q => q.examBody === "IAI").length} IAI
                </span>
              </div>
              <p className="text-[10px] text-slate-450 mt-2 font-mono">Synergy distribution of paper sets.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Core Subject Partition Distribution</span>
            
            <div className="space-y-3 font-mono text-xs">
              {["CM1", "CM2", "CS1", "CS2", "CB1", "CB2", "CP1", "CP2", "CP3", "SP", "SA"].map((sub) => {
                const count = questions.filter(
                  q => q.subject === sub || (sub === "SP" && q.subject.startsWith("SP")) || (sub === "SA" && q.subject.startsWith("SA"))
                ).length;
                const percent = questions.length > 0 ? (count / questions.length) * 100 : 0;

                return (
                  <div key={sub} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Subject {sub} Series</span>
                      <span>{count} unit ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-slate-900 rounded-full h-2 transition-all duration-500" style={{ width: `${percent}%` }} />
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
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-3">Active Test Candidates Telemetry</span>
          
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <strong className="text-slate-900 font-bold block">adityaagarwal113@gmail.com</strong>
                <span className="text-slate-400 text-[10px] block">Role: Administrator</span>
              </div>
              <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-1 rounded text-[10px]">ACTIVE</span>
            </div>

            <div className="p-4 border border-slate-100 rounded-xl flex items-center justify-between opacity-80">
              <div>
                <strong className="text-slate-900 font-bold block">candidate.test@actuaryvault.com</strong>
                <span className="text-slate-400 text-[10px] block">Role: Student</span>
              </div>
              <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded text-[10px]">OFFLINE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
