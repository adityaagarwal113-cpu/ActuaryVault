import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import StudentModule from "./components/StudentModule";
import AdminPanel from "./components/AdminPanel";
import AuthModal from "./components/AuthModal";
import BookmarksDrawer from "./components/BookmarksDrawer";
import GlobalSearchModal from "./components/GlobalSearchModal";
import { Question } from "./types";
import { initialQuestions } from "./utils/seedData";
import { db, auth } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { ShieldAlert, BookOpen, Layers, Check, Sparkles, RefreshCw, KeyRound, Star } from "lucide-react";

export default function App() {
  // Application Roles and views
  const [currentRole, setCurrentRole] = useState<"student" | "admin">("student");
  const [user, setUser] = useState<User | null>(null);

  // Database core state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingDb, setLoadingDb] = useState<boolean>(true);

  // Bookmark favorites state list
  const [favorites, setFavorites] = useState<string[]>([]);

  // Layout presentation modulators
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Track if we are running in local demo-mode fallback
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Sync Questions database from Firestore
  const fetchQuestionsFromFirestore = async () => {
    setLoadingDb(true);
    try {
      const querySnapshot = await getDocs(collection(db, "questions"));
      const list: Question[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data() as Question);
      });

      // If database has 0 items, seed dynamically on cold startup
      if (list.length === 0) {
        console.log("Sync: Firestore empty. Injecting seed dataset...");
        for (const q of initialQuestions) {
          await addDoc(collection(db, "questions"), q);
          list.push(q);
        }
      }

      setQuestions(list);
      setIsDemoMode(false);
    } catch (err) {
      console.warn("Sync warning: Could not communicate with Firestore. Operating in Portable Demo mode.", err);
      // Fallback securely to initial seed questions so preview runs flawlessly
      setQuestions(initialQuestions);
      setIsDemoMode(true);
    } finally {
      setLoadingDb(false);
    }
  };

  // Synchronize Auth sessions
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsub();
  }, []);

  // Fetch collections on startup
  useEffect(() => {
    fetchQuestionsFromFirestore();
  }, []);

  // Bookmarking load/save synchronization
  useEffect(() => {
    const localFavs = localStorage.getItem("actuary_vault_favs_v1");
    if (localFavs) {
      setFavorites(JSON.parse(localFavs));
    }
  }, []);

  const handleToggleFavorite = (questionId: string) => {
    let nextFavs = [...favorites];
    if (nextFavs.includes(questionId)) {
      nextFavs = nextFavs.filter((id) => id !== questionId);
    } else {
      nextFavs.push(questionId);
    }
    setFavorites(nextFavs);
    localStorage.setItem("actuary_vault_favs_v1", JSON.stringify(nextFavs));
  };

  const handleRemoveBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleFavorite(id);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentRole("student");
  };

  // Seeder trigger trigger button
  const handleForceReSeed = async () => {
    setLoadingDb(true);
    try {
      for (const q of initialQuestions) {
        await addDoc(collection(db, "questions"), q);
      }
      await fetchQuestionsFromFirestore();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans">
      {/* 1. Global Navigation Bar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
        favoritesCount={favorites.length}
        onToggleBookmarks={() => setIsBookmarksOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Hero Welcome Announcement */}
      <header className="bg-[#0F172A] border-b border-slate-800 text-white py-12 px-4 shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-400 to-indigo-600 shadow-xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-350 bg-clip-text text-transparent">
            Continuous Actuarial Exam Excellence
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto sm:text-base leading-relaxed">
            The world's premium interactive question bank platform aligned with official IFOA and IAI examination subjects.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs font-mono">
            <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300">
              ⚡ Live OCR Pipeline
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300">
              💎 Fully Editable Queue
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300">
              🎓 Safe Syllabus Rephrasing
            </div>
          </div>
        </div>
      </header>

      {/* Main Core Router Workspace */}
      <main className="flex-grow">
        {loadingDb ? (
          <div className="text-center py-24 space-y-3">
            <RefreshCw className="h-8 w-8 text-sky-500 animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-500">Synchronizing Actuary study databases...</p>
          </div>
        ) : currentRole === "admin" ? (
          /* ADMIN WORKSPACE PANEL */
          <AdminPanel questions={questions} onRefreshDatabase={fetchQuestionsFromFirestore} />
        ) : (
          /* STUDENT PRACTICE WORKSPACE */
          <StudentModule
            questions={questions}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </main>

      {/* Developer helper floating seed panel inside page footer margin (architectural precision) */}
      <footer className="bg-[#0F172A] border-t border-slate-800 py-6 mt-12 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>© 2026 ActuaryVault Inc. Authorized credentials gate.</p>
          {isDemoMode && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] uppercase font-bold">
              <ShieldAlert className="h-3 w-3 text-amber-400" /> Standalone Client Mode Active
            </div>
          )}
          <div className="pt-2">
            <button
              onClick={handleForceReSeed}
              className="text-[10px] text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-xl transition hover:bg-slate-800 cursor-pointer"
            >
              Re-seed/Sync Clean Questions
            </button>
          </div>
        </div>
      </footer>

      {/* 2. Authentication Dialog Portal */}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onSuccess={fetchQuestionsFromFirestore}
        />
      )}

      {/* 3. Global Search Dialog Portal */}
      {isSearchOpen && (
        <GlobalSearchModal
          questions={questions}
          onClose={() => setIsSearchOpen(false)}
          onSelectQuestion={(q) => {
            // Force role to student & open question in student viewer
            setCurrentRole("student");
            // Highlight the selected question inside student module component
            const el = document.getElementById("favorites-shortcut");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

      {/* 4. saved Bookmarks drawer Portal */}
      {isBookmarksOpen && (
        <BookmarksDrawer
          questions={questions}
          favoriteIds={favorites}
          onClose={() => setIsBookmarksOpen(false)}
          onSelectQuestion={(q) => {
            setCurrentRole("student");
          }}
          onRemoveBookmark={handleRemoveBookmark}
        />
      )}
    </div>
  );
}
