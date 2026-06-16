import React, { useState } from "react";
import { Question } from "../types";
import { X, Search, ChevronRight, HelpCircle, FileText, Sparkles, Folder } from "lucide-react";

interface GlobalSearchModalProps {
  questions: Question[];
  onClose: () => void;
  onSelectQuestion: (q: Question) => void;
}

export default function GlobalSearchModal({
  questions,
  onClose,
  onSelectQuestion,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState<string>("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const getResults = () => {
    if (query.trim() === "") return [];
    const kw = query.toLowerCase();

    return questions.filter(
      (q) =>
        q.status === "approved" &&
        (q.question.toLowerCase().includes(kw) ||
          q.topic.toLowerCase().includes(kw) ||
          q.chapter.toLowerCase().includes(kw) ||
          q.subject.toLowerCase().includes(kw) ||
          (q.commandWord && q.commandWord.toLowerCase().includes(kw)) ||
          (q.term && q.term.toLowerCase().includes(kw)) ||
          q.examBody.toLowerCase().includes(kw))
    );
  };

  const results = getResults();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/80 backdrop-blur-sm pt-20">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-800 anim-fade-in">
        
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Type any keywords, subjects (e.g. SP5, CP1), chapters (e.g. ALM) or terms..."
            value={query}
            onChange={handleSearchChange}
            className="w-full text-sm outline-none focus:ring-0 bg-transparent"
          />
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition" title="Dismiss search">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results Drawer */}
        <div className="max-h-[350px] overflow-y-auto p-4 space-y-2">
          {query.trim() === "" ? (
            <div className="text-center py-12 text-slate-400 text-xs font-mono space-y-2">
              <CompassIcon className="h-8 w-8 text-slate-300 mx-auto" />
              <p>Search standard curriculum indexed databases.</p>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto pt-3">
                {["SP5", "CP1", "CM1", "Markov Chains", "Immunisation", "Nov 2025"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-150 hover:bg-slate-100 transition rounded-lg text-[10px]"
                  >
                    "{tag}"
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-mono">
              <p>No results matched "{query}". Try a broader term.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-bold block mb-1">
                Matched Questions ({results.length})
              </span>
              
              {results.map((q) => (
                <button
                  key={q.questionId}
                  onClick={() => {
                    onSelectQuestion(q);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-2xl border border-slate-100 hover:border-slate-250 bg-slate-50/20 hover:bg-slate-50 transition duration-150 flex items-start gap-3 text-xs"
                >
                  <div className="bg-slate-900 text-white rounded-xl h-8 w-8 flex items-center justify-center font-bold flex-shrink-0">
                    {q.subject}
                  </div>
                  <div className="flex-1 space-y-1 truncate">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span className="font-bold uppercase text-slate-500">{q.examBody}</span>
                      <span>•</span>
                      <span>{q.chapter}</span>
                      {q.term && (
                        <>
                          <span>•</span>
                          <span className="text-sky-600 font-bold">{q.term}</span>
                        </>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900 truncate">{q.question}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 mt-1" />
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
