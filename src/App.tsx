import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import StudentModule from "./components/StudentModule";
import AdminPanel from "./components/AdminPanel";
import AuthModal from "./components/AuthModal";
import BookmarksDrawer from "./components/BookmarksDrawer";
import GlobalSearchModal from "./components/GlobalSearchModal";
import { Question, PastPaperPdf } from "./types";
import { initialQuestions } from "./utils/seedData";
import { db, auth } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { ShieldAlert, BookOpen, Layers, Check, Sparkles, RefreshCw, KeyRound, Star, Clock, Compass, HelpCircle, GraduationCap } from "lucide-react";

export default function App() {
  // Application Roles and views
  const [currentRole, setCurrentRole] = useState<"student" | "admin">("student");
  const [user, setUser] = useState<User | null>(null);

  // Database core state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pastPapers, setPastPapers] = useState<PastPaperPdf[]>([]);
  const [loadingDb, setLoadingDb] = useState<boolean>(true);

  // Sync Past Papers database from Firestore
  const fetchPastPapersFromFirestore = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "past_papers"));
      const list: PastPaperPdf[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PastPaperPdf);
      });
      setPastPapers(list);
    } catch (err) {
      console.warn("Sync warning: Could not fetch past papers from Firestore", err);
    }
  };

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
    fetchPastPapersFromFirestore();
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
      <header className="bg-gradient-to-b from-[#020512] via-[#0b132a] to-[#020617] border-b border-slate-800/60 text-white py-16 px-4 relative overflow-hidden">
        {/* Soft immersive ambient lights */}
        <div className="absolute top-[-50px] left-1/4 w-[400px] h-[300px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[-50px] right-1/4 w-[400px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          
          {/* Charming Welcoming Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-400/20 rounded-full text-xs font-semibold text-sky-400 tracking-wide shadow-inner shadow-sky-500/5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            🚀 Elevate Your Actuarial Exam Preparation
          </div>

          {/* Eye-catching responsive Brand Typography */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-white leading-tight">
              Actuary<span className="bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">Vault</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto sm:text-base leading-relaxed font-sans font-medium">
              Your ultimate student-friendly companion for mastering the <span className="text-sky-300 font-bold">IFoA & Core Actuarial syllabi</span>. Access high-fidelity mock simulators, step-by-step guidance, and real past-paper solutions tailored exactly to your curriculum goals.
            </p>
          </div>

          {/* Grid of Student-Friendly Bento Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 text-left">
            
            {/* Bento Card 1: Exam Simulators */}
            <div className="relative group p-5 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-sky-500/40 rounded-2xl transition duration-300 shadow-md flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/5 blur-xl group-hover:bg-sky-500/10 transition rounded-full" />
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3 group-hover:scale-110 transition duration-300">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-400 transition">Interactive Mock Simulators</h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Generate timed mock papers matching your target chapters. Adjust durations, test specific topics, and build real exam stamina.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-sky-400/80">
                <span>⚡ Real-Time Timer</span>
                <span>Unlimited generation</span>
              </div>
            </div>

            {/* Bento Card 2: AI Explanations */}
            <div className="relative group p-5 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl transition duration-300 shadow-md flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition rounded-full" />
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition duration-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition">Syllabus Rephrasing</h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Stuck on cryptic question wording? Read simplified, jargon-free versions alongside step-by-step mathematical breakdowns.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-indigo-400/80">
                <span>🤖 Intelligent Helper</span>
                <span>Active study buddy</span>
              </div>
            </div>

            {/* Bento Card 3: Dynamic Navigator */}
            <div className="relative group p-5 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl transition duration-300 shadow-md flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition rounded-full" />
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition duration-300">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition">Curriculum Navigator</h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Explore approved past papers categorized strictly by core subjects (CM1, CS2, SP, etc.) and complete individual chapter checks.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-emerald-400/80">
                <span>📁 Mapped Syllabus</span>
                <span>Instant past papers</span>
              </div>
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
          <AdminPanel 
            questions={questions} 
            pastPapers={pastPapers}
            onRefreshDatabase={fetchQuestionsFromFirestore} 
            onRefreshPastPapers={fetchPastPapersFromFirestore}
          />
        ) : (
          /* STUDENT PRACTICE WORKSPACE */
          <StudentModule
            questions={questions}
            pastPapers={pastPapers}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            user={user}
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
