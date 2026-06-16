import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { X, Mail, Lock, User, Info, CheckCircle, ShieldAlert, KeyRound } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorText("Please fill out all fields.");
      return;
    }

    setLoading(true);
    setErrorText(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg("Account successfully registered! Logging in...");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg("Successfully logged in!");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      let cleanErr = err.message;
      if (err.code === "auth/invalid-credential") {
        cleanErr = "Incorrect email or password combination.";
      } else if (err.code === "auth/weak-password") {
        cleanErr = "Password should be at least 6 characters.";
      } else if (err.code === "auth/email-already-in-use") {
        cleanErr = "This email is already registered.";
      }
      setErrorText(cleanErr);
    } finally {
      setLoading(false);
    }
  };

  // Immediate Testing presets bypass triggers
  const handleSignWithPreset = async (role: "student" | "admin") => {
    setLoading(true);
    setErrorText(null);
    setSuccessMsg(null);
    const targetEmail = role === "admin" ? "adityaagarwal113@gmail.com" : "candidate.test@actuaryvault.com";
    const targetPassword = "ActuaryVaultTesting2026";

    try {
      try {
        await signInWithEmailAndPassword(auth, targetEmail, targetPassword);
      } catch (e) {
        // If account doesn't exist, register it automatically
        await createUserWithEmailAndPassword(auth, targetEmail, targetPassword);
      }
      setSuccessMsg(`Logged in successfully as ${role === "admin" ? "Admin" : "Student"}!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorText(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden text-slate-800 anim-fade-in relative">
        
        {/* Header decoration banner */}
        <div className="bg-slate-950 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg">ActuaryVault Auth</h3>
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 -mt-0.5">Firebase Secure Vault Gate</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Container */}
        <div className="p-6 space-y-4">
          
          {/* Status alerts */}
          {errorText && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-mono font-semibold text-rose-800">
              {errorText}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-mono font-semibold text-emerald-800">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-mono">
            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Email address</label>
              <div className="relative">
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 text-xs"
                />
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Security Password</label>
              <div className="relative">
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 text-xs"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-950 text-white font-bold rounded-xl transition hover:bg-slate-900 border border-slate-800 cursor-pointer text-xs"
            >
              {loading ? "Security check..." : isSignUp ? "Create Student Account" : "Access Prep Platform"}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-mono font-bold text-sky-600 hover:underline"
            >
              {isSignUp ? "Already registered? Login instead" : "Need to register? Create account"}
            </button>
          </div>

          {/* QUICK TESTING BYPASS TRIGGERS */}
          <div className="border-t border-slate-100 pt-4 mt-2">
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 uppercase tracking-widest justify-center mb-3">
              <KeyRound className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Testing Preset Entry
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSignWithPreset("student")}
                className="p-2 border border-slate-200 rounded-xl text-[10px] font-mono bg-slate-50 text-slate-700 hover:bg-slate-100 transition text-center font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <User className="h-3 w-3" /> Test Student
              </button>
              <button
                type="button"
                onClick={() => handleSignWithPreset("admin")}
                className="p-2 border border-amber-200 text-amber-800 rounded-xl text-[10px] font-mono bg-amber-50/50 hover:bg-amber-100/30 transition text-center font-black flex items-center justify-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="h-3 w-3 text-amber-500" /> Admin Bypass
              </button>
            </div>
            
            <p className="text-[9px] text-slate-400 text-center font-mono mt-2.5 flex items-center gap-1 justify-center">
              <Info className="h-3 w-3" /> Auto-creates test users in Firestore/Auth with correct system scopes!
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
