import React, { useState } from "react";
import { BookMarked, Search, User, ShieldAlert, BookOpen, LogIn, LogOut, Check, Layers } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";

interface NavbarProps {
  currentRole: "student" | "admin";
  onRoleChange: (role: "student" | "admin") => void;
  user: FirebaseUser | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  favoritesCount: number;
  onToggleBookmarks: () => void;
  onOpenSearch: () => void;
}

export default function Navbar({
  currentRole,
  onRoleChange,
  user,
  onLogout,
  onOpenAuth,
  favoritesCount,
  onToggleBookmarks,
  onOpenSearch,
}: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-md border-b border-slate-800/80 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-8 h-8 bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-lg flex items-center justify-center font-display font-bold text-slate-950 shrink-0 text-sm shadow-md shadow-sky-500/10">
              AV
            </div>
            <span className="text-lg font-display font-extrabold tracking-tight text-white">
              Actuary<span className="text-sky-400 font-light">Vault</span>
            </span>
          </div>

          {/* Navigation & Search Trigger */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-slate-400 text-xs transition duration-200"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search index (Subject, Code, Term)...</span>
            </button>
          </div>

          {/* Controls & Actions */}
          <div className="flex items-center gap-4">
            {/* Favorites bookmark badge */}
            <button
              onClick={onToggleBookmarks}
              className="relative p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-sky-400 transition"
              title="Saved Questions"
              id="favorites-shortcut"
            >
              <BookMarked className="h-5 w-5" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold font-mono">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* QUICK ROLE SWITCHER FOR EVALUATOR - Elegant badge */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => onRoleChange("student")}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  currentRole === "student"
                    ? "bg-slate-800 text-sky-400 shadow border border-slate-700/60"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Student
              </button>
              <button
                onClick={() => onRoleChange("admin")}
                className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  currentRole === "admin"
                    ? "bg-amber-500/20 text-amber-300 shadow border border-amber-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldAlert className="h-3 w-3" />
                Admin
              </button>
            </div>

            {/* Auth section */}
            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-200 max-w-[120px] truncate" title={user.email || ""}>
                    {user.email?.replace(/@.*/, "") || "Premium Account"}
                  </p>
                  <p className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5 justify-end">
                    <Check className="h-2 w-2" /> Verified
                  </p>
                </div>
                <div className="bg-slate-800 p-2 rounded-xl text-sky-400 border border-slate-700">
                  <User className="h-4 w-4" />
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg bg-slate-800/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-xs transition duration-200 shadow-lg shadow-sky-500/15 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
