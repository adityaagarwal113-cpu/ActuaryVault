import React from "react";
import { Question } from "../types";
import { X, Star, FileText, ChevronRight, Bookmark } from "lucide-react";

interface BookmarksDrawerProps {
  questions: Question[];
  favoriteIds: string[];
  onClose: () => void;
  onSelectQuestion: (q: Question) => void;
  onRemoveBookmark: (id: string, e: React.MouseEvent) => void;
}

export default function BookmarksDrawer({
  questions,
  favoriteIds,
  onClose,
  onSelectQuestion,
  onRemoveBookmark,
}: BookmarksDrawerProps) {
  const savedQuestions = questions.filter((q) => favoriteIds.includes(q.questionId));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm">
      {/* Click outside to close wrapper */}
      <div className="flex-1" onClick={onClose} />

      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col text-slate-800 anim-slide-left">
        {/* Header */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-sky-400" />
            <div>
              <h4 className="font-display font-bold text-sm">Saved Practice Questions</h4>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Personal study list ({savedQuestions.length})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedQuestions.length === 0 ? (
            <div className="text-center py-20 text-slate-405 text-xs font-mono">
              <Star className="h-8 w-8 text-slate-300 mx-auto mb-3 animate-pulse" />
              <p>You haven't bookmarked any actuarial questions yet.</p>
              <p className="text-[10px] text-slate-400 mt-2 max-w-[200px] mx-auto">Click the bookmark star inside any question header to save it here.</p>
            </div>
          ) : (
            savedQuestions.map((q) => (
              <div
                key={q.questionId}
                onClick={() => {
                  onSelectQuestion(q);
                  onClose();
                }}
                className="group relative p-3.5 rounded-2xl border border-slate-100 hover:border-slate-250 bg-slate-50/20 hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                  <span className="font-bold text-slate-500 uppercase">{q.examBody} / {q.subject}</span>
                  <button
                    onClick={(e) => onRemoveBookmark(q.questionId, e)}
                    className="text-amber-500 hover:text-slate-400 transition"
                    title="Remove from saved list"
                  >
                    <Star className="h-4 w-4 fill-amber-500 hover:fill-none" />
                  </button>
                </div>
                
                <h5 className="font-semibold text-slate-900 group-hover:text-slate-900 truncate pr-6 mb-2">{q.question}</h5>
                
                <div className="flex items-center justify-between font-mono text-[9px] text-slate-400">
                  <span>{q.chapter}</span>
                  <strong>{q.marks} Marks</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
